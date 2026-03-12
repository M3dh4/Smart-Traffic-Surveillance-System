"""
TrafficProcessor
================
Runs the full detection pipeline on an uploaded image or video file.
Upgraded with deterministic Stop-Line Crossing logic and OpenCV Traffic Light state detection.
"""

import os
import io
import cv2
import csv
import uuid
import base64
import json
import time
from pathlib import Path
from datetime import datetime

import numpy as np
from PIL import Image

# ── Optional heavy imports with graceful fallback ──────────────────────────
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[WARNING] ultralytics not installed – using Gemini-only fallback")

try:
    import easyocr
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# ── SORT tracker (optional) ────────────────────────────────────────────────
try:
    from sort.sort import Sort as SORTTracker
    SORT_AVAILABLE = True
except ImportError:
    SORT_AVAILABLE = False

# ── Constants ──────────────────────────────────────────────────────────────
MODELS_DIR          = Path(__file__).parent / "models"
PLATE_MODEL_PATH    = MODELS_DIR / "license_plate_detector.pt"

# COCO class ids for YOLO
VEHICLE_CLASSES     = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
TRAFFIC_LIGHT_CLASS = 9

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyCY77OgMDXLNxMdXu3SX2OOjjsrb9je2R8")

IMAGE_EXTS  = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXTS  = {".mp4", ".avi", ".mov", ".mkv"}

FRAME_SAMPLE_RATE = 15


class TrafficProcessor:
    def __init__(self):
        self._vehicle_model   = None
        self._plate_model     = None
        self._ocr_reader      = None
        self._gemini_model    = None
        self._init_models()

    def _init_models(self):
        # Upgraded to yolov8s.pt for much better accuracy
        if YOLO_AVAILABLE:
            try:
                self._vehicle_model = YOLO("yolov8s.pt")
            except Exception as e:
                print(f"[WARNING] Could not load YOLOv8s: {e}")

            if PLATE_MODEL_PATH.exists():
                try:
                    self._plate_model = YOLO(str(PLATE_MODEL_PATH))
                except Exception:
                    pass

        if OCR_AVAILABLE:
            try:
                self._ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            except Exception:
                pass

        if GEMINI_AVAILABLE:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                self._gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception:
                pass

    def process_file(self, file_path: Path, filename: str, job_id: str, progress_cb=None) -> dict:
        ext = file_path.suffix.lower()
        if ext in IMAGE_EXTS:
            return self._process_image(file_path, filename, job_id, progress_cb)
        elif ext in VIDEO_EXTS:
            return self._process_video(file_path, filename, job_id, progress_cb)
        raise ValueError(f"Unsupported file type: {ext}")

    def _process_image(self, file_path: Path, filename: str, job_id: str, progress_cb=None) -> dict:
        if progress_cb: progress_cb(20)

        img_bgr = cv2.imread(str(file_path))
        if img_bgr is None: raise ValueError("Could not read image file")

        if progress_cb: progress_cb(40)

        vehicles, tl_boxes = self._detect_vehicles_in_frame(img_bgr, frame_idx=0)
        
        # Analyze light state and define stop line
        light_state = self._analyze_traffic_light(img_bgr, tl_boxes)
        if light_state == "UNKNOWN":
            light_state = self._gemini_get_light_state(_frame_to_b64(img_bgr))
            
        stop_line_y = int(img_bgr.shape[0] * 0.65)

        if progress_cb: progress_cb(70)

        # Violation Logic (Static Image)
        for v in vehicles:
            bottom_y = v["bbox"][3]
            v["red_light_violation"] = (light_state == "RED" and bottom_y > stop_line_y)

        if progress_cb: progress_cb(90)

        return {
            "job_id": job_id,
            "filename": filename,
            "media_type": "image",
            "processed_at": datetime.utcnow().isoformat(),
            "vehicles": vehicles,
            "summary": _make_summary(vehicles),
            "annotated_frame": self._annotate_frame(img_bgr, vehicles, stop_line_y, light_state),
        }

    def _process_video(self, file_path: Path, filename: str, job_id: str, progress_cb=None) -> dict:
        cap = cv2.VideoCapture(str(file_path))
        if not cap.isOpened(): raise ValueError("Could not open video file")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25

        tracker = SORTTracker() if SORT_AVAILABLE else None
        all_vehicles = {}
        vehicle_history = {} # vid -> list of bottom_y
        
        frame_idx = 0
        processed = 0
        global_light_state = "UNKNOWN"
        stop_line_y = 0
        key_frame_bgr = None

        while True:
            ret, frame = cap.read()
            if not ret: break

            if frame_idx % FRAME_SAMPLE_RATE == 0:
                h, w = frame.shape[:2]
                stop_line_y = int(h * 0.65)
                key_frame_bgr = frame.copy()

                frame_vehicles, tl_boxes = self._detect_vehicles_in_frame(frame, frame_idx=frame_idx, fps=fps, tracker=tracker)

                # Light State Detection
                current_light = self._analyze_traffic_light(frame, tl_boxes)
                if current_light == "UNKNOWN" and frame_idx == 0:
                    current_light = self._gemini_get_light_state(_frame_to_b64(frame))
                
                if current_light != "UNKNOWN":
                    global_light_state = current_light

                # Tracking & Violation Logic
                for v in frame_vehicles:
                    vid = v["vehicle_id"]
                    bottom_y = v["bbox"][3]

                    if vid not in vehicle_history:
                        vehicle_history[vid] = []

                    is_violating = all_vehicles.get(vid, {}).get("red_light_violation", False)

                    if global_light_state == "RED":
                        if len(vehicle_history[vid]) > 0:
                            prev_y = vehicle_history[vid][-1]
                            # Crossed the line downwards
                            if prev_y <= stop_line_y and bottom_y > stop_line_y:
                                is_violating = True
                        else:
                            if bottom_y > stop_line_y:
                                is_violating = True

                    v["red_light_violation"] = is_violating
                    vehicle_history[vid].append(bottom_y)
                    
                    # Update plate if confidence is higher
                    if vid in all_vehicles and v.get("detection_confidence", 0) <= all_vehicles[vid].get("detection_confidence", 0):
                        v["license_plate"] = all_vehicles[vid]["license_plate"]
                        
                    all_vehicles[vid] = v

                processed += 1
                if progress_cb and total_frames > 0:
                    pct = 20 + int(70 * frame_idx / total_frames)
                    progress_cb(min(pct, 89))

            frame_idx += 1

        cap.release()
        vehicles = list(all_vehicles.values())

        if progress_cb: progress_cb(95)

        annotated_b64 = None
        if key_frame_bgr is not None:
            annotated_b64 = self._annotate_frame(key_frame_bgr, vehicles, stop_line_y, global_light_state)

        return {
            "job_id": job_id,
            "filename": filename,
            "media_type": "video",
            "processed_at": datetime.utcnow().isoformat(),
            "total_frames": total_frames,
            "sampled_frames": processed,
            "vehicles": vehicles,
            "summary": _make_summary(vehicles),
            "annotated_frame": annotated_b64,
        }

    def _detect_vehicles_in_frame(self, frame_bgr, frame_idx=0, fps=25, tracker=None):
        vehicles = []
        tl_boxes = []

        if self._vehicle_model is None:
            return vehicles, tl_boxes

        results = self._vehicle_model(frame_bgr, verbose=False)[0]
        detections_for_sort = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf  = float(box.conf[0])
            if conf < 0.30: continue
            
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            if cls_id in VEHICLE_CLASSES:
                detections_for_sort.append([x1, y1, x2, y2, conf, cls_id])
            elif cls_id == TRAFFIC_LIGHT_CLASS:
                tl_boxes.append([x1, y1, x2, y2])

        if not detections_for_sort:
            return vehicles, tl_boxes

        if tracker is not None and SORT_AVAILABLE:
            sort_input = np.array([[*d[:5]] for d in detections_for_sort])
            tracked = tracker.update(sort_input)
            id_map = {}
            for t in tracked:
                tx1, ty1, tx2, ty2, tid = map(int, t)
                best_cls, best_conf = 2, 0.0
                for d in detections_for_sort:
                    dx1, dy1, dx2, dy2, dconf, dcls = d
                    if _iou([tx1, ty1, tx2, ty2], [dx1, dy1, dx2, dy2]) > 0.4 and dconf > best_conf:
                        best_cls, best_conf = dcls, dconf
                id_map[tid] = (tx1, ty1, tx2, ty2, best_cls, best_conf)

            for tid, (x1, y1, x2, y2, cls_id, conf) in id_map.items():
                plate = self._read_plate(frame_bgr, x1, y1, x2, y2)
                vehicles.append({
                    "vehicle_id":         f"VH-{tid:04d}",
                    "vehicle_type":        VEHICLE_CLASSES.get(cls_id, "vehicle"),
                    "detection_confidence": round(conf, 3),
                    "license_plate":       plate,
                    "red_light_violation": False,
                    "frame_time":          round(frame_idx / max(fps, 1), 2),
                    "bbox":                [x1, y1, x2, y2],
                })
        else:
            for i, (x1, y1, x2, y2, conf, cls_id) in enumerate(detections_for_sort):
                plate = self._read_plate(frame_bgr, x1, y1, x2, y2)
                vehicles.append({
                    "vehicle_id":         f"VH-{frame_idx:05d}-{i:02d}",
                    "vehicle_type":        VEHICLE_CLASSES.get(cls_id, "vehicle"),
                    "detection_confidence": round(conf, 3),
                    "license_plate":       plate,
                    "red_light_violation": False,
                    "frame_time":          round(frame_idx / max(fps, 1), 2),
                    "bbox":                [x1, y1, x2, y2],
                })

        return vehicles, tl_boxes

    def _analyze_traffic_light(self, frame_bgr, tl_boxes) -> str:
        """Determines if the light is Red or Green using HSV masking."""
        if not tl_boxes: return "UNKNOWN"
        
        # Pick largest traffic light box to avoid background noise
        tl_boxes = sorted(tl_boxes, key=lambda b: (b[2]-b[0])*(b[3]-b[1]), reverse=True)
        x1, y1, x2, y2 = tl_boxes[0]

        crop = frame_bgr[max(0, y1):y2, max(0, x1):x2]
        if crop.size == 0: return "UNKNOWN"

        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        # Red masks
        mask_red1 = cv2.inRange(hsv, np.array([0, 70, 50]), np.array([10, 255, 255]))
        mask_red2 = cv2.inRange(hsv, np.array([170, 70, 50]), np.array([180, 255, 255]))
        mask_red = cv2.bitwise_or(mask_red1, mask_red2)
        # Green mask
        mask_green = cv2.inRange(hsv, np.array([40, 50, 50]), np.array([90, 255, 255]))

        r_count = cv2.countNonZero(mask_red)
        g_count = cv2.countNonZero(mask_green)

        if r_count > g_count and r_count > 5: return "RED"
        if g_count > r_count and g_count > 5: return "GREEN"
        return "UNKNOWN"

    def _gemini_get_light_state(self, frame_b64: str) -> str:
        if not self._gemini_model: return "UNKNOWN"
        try:
            img_data = base64.b64decode(frame_b64)
            img = Image.open(io.BytesIO(img_data))
            prompt = "Is the active traffic light in this image RED or GREEN? Reply with exactly 'RED' or 'GREEN'. If no light is visible, reply 'UNKNOWN'."
            resp = self._gemini_model.generate_content([prompt, img])
            txt = resp.text.strip().upper()
            if "RED" in txt: return "RED"
            if "GREEN" in txt: return "GREEN"
            return "UNKNOWN"
        except:
            return "UNKNOWN"

    def _read_plate(self, frame_bgr, x1, y1, x2, y2) -> str:
        vehicle_crop = frame_bgr[max(0, y1):y2, max(0, x1):x2]
        if vehicle_crop.size == 0: return ""

        plate_region = vehicle_crop
        if self._plate_model is not None:
            try:
                presults = self._plate_model(vehicle_crop, verbose=False)[0]
                if len(presults.boxes) > 0:
                    pb = presults.boxes[0]
                    px1, py1, px2, py2 = map(int, pb.xyxy[0])
                    plate_region = vehicle_crop[max(0,py1):py2, max(0,px1):px2]
            except Exception: pass

        if plate_region.size == 0: return ""

        if self._ocr_reader is not None:
            try:
                ocr_results = self._ocr_reader.readtext(plate_region, detail=0, paragraph=False)
                text = " ".join(ocr_results).upper().strip()
                text = "".join(c for c in text if c.isalnum() or c in " -")
                return text[:20]
            except Exception: pass

        return ""

    def _annotate_frame(self, frame_bgr, vehicles: list, stop_line_y: int, light_state: str) -> str:
        annotated = frame_bgr.copy()
        h, w = annotated.shape[:2]

        # Colors
        state_color = (0, 255, 255) # Yellow
        if light_state == "RED": state_color = (0, 0, 255)
        elif light_state == "GREEN": state_color = (0, 255, 0)

        # Draw HUD Banner
        cv2.rectangle(annotated, (0, 0), (350, 60), (0, 0, 0), -1)
        cv2.putText(annotated, f"LIGHT: {light_state}", (15, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, state_color, 3)

        # Draw Stop Line
        cv2.line(annotated, (0, stop_line_y), (w, stop_line_y), state_color, 3)
        cv2.putText(annotated, "STOP LINE", (15, stop_line_y - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.8, state_color, 2)

        for v in vehicles:
            bbox = v.get("bbox", [])
            if len(bbox) != 4: continue
            x1, y1, x2, y2 = bbox
            is_viol = v.get("red_light_violation", False)
            
            v_color = (0, 0, 255) if is_viol else (0, 255, 0)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), v_color, 2)
            
            label = f"{v['vehicle_type']} {v.get('license_plate', '')}".strip()
            if is_viol: label = "VIOLATION " + label
            cv2.putText(annotated, label, (x1, max(20, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, v_color, 2)

        return _frame_to_b64(annotated)


def _frame_to_b64(frame_bgr) -> str:
    _, buf = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buf).decode("utf-8")

def _iou(boxA, boxB) -> float:
    xA, yA = max(boxA[0], boxB[0]), max(boxA[1], boxB[1])
    xB, yB = min(boxA[2], boxB[2]), min(boxA[3], boxB[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    if inter == 0: return 0.0
    aA = (boxA[2]-boxA[0]) * (boxA[3]-boxA[1])
    aB = (boxB[2]-boxB[0]) * (boxB[3]-boxB[1])
    return inter / float(aA + aB - inter)

def _make_summary(vehicles: list) -> dict:
    total      = len(vehicles)
    plates     = sum(1 for v in vehicles if v.get("license_plate"))
    violations = sum(1 for v in vehicles if v.get("red_light_violation"))
    types = {}
    for v in vehicles:
        t = v.get("vehicle_type", "unknown")
        types[t] = types.get(t, 0) + 1
    return {
        "total_vehicles":    total,
        "plates_detected":   plates,
        "violations":        violations,
        "avg_speed":         0,
        "vehicle_type_counts": types,
    }