/* ──────────────────────────────────────────────────────────────────────────
   Smart Traffic Surveillance — Frontend Script
────────────────────────────────────────────────────────────────────────── */

const API = "http://localhost:5000/api";

let selectedFiles   = [];
let activeJobs      = {};
let violationChart  = null;
let volumeChart     = null;

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initDropZone();
  checkAPI();
  setInterval(checkAPI, 30_000);
});

function initNav() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const sec = link.dataset.section;
      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      link.classList.add("active");
      document.getElementById(sec).classList.add("active");

      if (sec === "vehicles")  loadVehicles();
      if (sec === "dashboard") loadDashboard();
      if (sec === "processing") renderJobs();
    });
  });
}

async function checkAPI() {
  const dot  = document.getElementById("api-status");
  const text = document.getElementById("api-status-text");
  dot.className = "status-dot loading";
  text.textContent = "Connecting…";
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      dot.className  = "status-dot online";
      text.textContent = "Backend Online";
    } else throw new Error();
  } catch {
    dot.className  = "status-dot offline";
    text.textContent = "Backend Offline";
  }
}

function initDropZone() {
  const zone  = document.getElementById("dropZone");
  const input = document.getElementById("fileInput");

  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", ()  => zone.classList.remove("dragover"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragover");
    handleFiles([...e.dataTransfer.files]);
  });
  zone.addEventListener("click", e => { if (e.target.tagName !== "BUTTON") input.click(); });
  input.addEventListener("change", () => handleFiles([...input.files]));
}

function handleFiles(files) {
  const allowed = ["mp4","avi","mov","mkv","jpg","jpeg","png","webp"];
  files.forEach(f => {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) { toast(`Unsupported: ${f.name}`, "error"); return; }
    if (!selectedFiles.find(sf => sf.name === f.name)) selectedFiles.push(f);
  });
  renderFileList();
}

function renderFileList() {
  const container = document.getElementById("selectedFiles");
  const list      = document.getElementById("fileList");
  if (!selectedFiles.length) { container.style.display = "none"; return; }
  container.style.display = "block";
  list.innerHTML = selectedFiles.map((f,i) => `
    <div class="file-item">
      <i class="fas ${f.type.startsWith("video") ? "fa-film" : "fa-image"}"></i>
      <span class="file-name">${f.name}</span>
      <span class="file-size">${formatBytes(f.size)}</span>
      <button class="remove-file" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
    </div>
  `).join("");
}

function removeFile(idx) { selectedFiles.splice(idx, 1); renderFileList(); }
function clearFiles() { selectedFiles = []; document.getElementById("fileInput").value = ""; renderFileList(); }

async function startProcessing() {
  if (!selectedFiles.length) { toast("No files selected", "error"); return; }
  const btn = document.getElementById("startProcessingBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';

  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  document.querySelectorAll(".section").forEach(s  => s.classList.remove("active"));
  document.querySelector('[data-section="processing"]').classList.add("active");
  document.getElementById("processing").classList.add("active");

  for (const file of selectedFiles) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/upload`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) { toast(`Upload failed: ${data.error}`, "error"); continue; }
      toast(`Uploaded: ${file.name}`, "success");
      trackJob(data.job_id, file.name);
    } catch (err) { toast(`Network error: ${err.message}`, "error"); }
  }

  const countEl = document.getElementById("stat-uploads");
  countEl.textContent = parseInt(countEl.textContent || 0) + selectedFiles.length;
  clearFiles();
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-play"></i> Start Processing';
}

function trackJob(jobId, filename) {
  activeJobs[jobId] = { jobId, filename, status: "queued", progress: 0 };
  renderJobs();
  const interval = setInterval(async () => {
    try {
      const r = await fetch(`${API}/status/${jobId}`);
      const data = await r.json();
      activeJobs[jobId] = { ...activeJobs[jobId], ...data };
      renderJobs();
      if (data.status === "done" || data.status === "error") {
        clearInterval(interval);
        if (data.status === "done") toast(`✅ Complete: ${filename}`, "success");
        else toast(`❌ Error: ${data.error}`, "error");
      }
    } catch { clearInterval(interval); }
  }, 2000);
}

function renderJobs() {
  const container = document.getElementById("processingList");
  const jobs = Object.values(activeJobs);
  if (!jobs.length) {
    container.innerHTML = `<div class="no-jobs"><i class="fas fa-inbox"></i><p>No jobs running.</p></div>`;
    return;
  }
  container.innerHTML = jobs.map(j => jobCardHTML(j)).join("");
}

function jobCardHTML(j) {
  const pct = j.progress || 0;
  const statsHTML = j.status === "done" ? `
    <div class="job-live-stats">
      <div class="live-stat"><div class="lv">${j.vehicle_count ?? 0}</div><div class="ll">Vehicles</div></div>
      <div class="live-stat"><div class="lv">${j.plate_count ?? 0}</div><div class="ll">Plates ID'd</div></div>
      <div class="live-stat"><div class="lv">${j.violation_count ?? 0}</div><div class="ll">Violations</div></div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px;">
      <button class="btn btn-primary btn-sm" onclick="viewResults('${j.job_id}')"><i class="fas fa-eye"></i> View Results</button>
      <button class="btn btn-outline btn-sm" onclick="viewFrame('${j.job_id}')"><i class="fas fa-image"></i> Show Processed Frame</button>
    </div>
  ` : "";

  return `
    <div class="job-card">
      <div class="job-header">
        <i class="fas fa-film" style="color:var(--accent)"></i>
        <span class="job-name">${j.filename}</span>
        <span class="job-status ${j.status}">${j.status}</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      ${statsHTML}
    </div>
  `;
}

async function viewResults(jobId) {
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  document.querySelectorAll(".section").forEach(s  => s.classList.remove("active"));
  document.querySelector('[data-section="vehicles"]').classList.add("active");
  document.getElementById("vehicles").classList.add("active");
  loadVehicles();
}

async function viewFrame(jobId) {
  try {
    const r = await fetch(`${API}/results/${jobId}`);
    const data = await r.json();
    if (!r.ok) { toast(data.error, "error"); return; }
    if (data.annotated_frame) {
      document.getElementById("annotatedImage").src = "data:image/jpeg;base64," + data.annotated_frame;
      document.getElementById("frameModal").style.display = "flex";
    } else {
      toast("No frame available for this job.", "error");
    }
  } catch (err) { toast(`Error: ${err.message}`, "error"); }
}

function closeFrameModal(e) {
  if (e.target === document.getElementById("frameModal")) document.getElementById("frameModal").style.display = "none";
}

async function loadVehicles() {
  const params  = new URLSearchParams();
  const type    = document.getElementById("filterType")?.value || "";
  const viol    = document.getElementById("filterViolation")?.value || "";
  const plate   = document.getElementById("filterPlate")?.value || "";
  if (type)  params.set("type", type);
  if (viol)  params.set("violation", viol);
  if (plate) params.set("plate", plate);

  try {
    const r = await fetch(`${API}/vehicles?${params}`);
    const data = await r.json();
    if (!r.ok) return;

    document.getElementById("v-total").textContent      = data.stats.total;
    document.getElementById("v-violations").textContent = data.stats.violations;
    
    const tbody = document.getElementById("vehicleTableBody");
    if (!data.vehicles.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No vehicles found</td></tr>`; return; }
    
    tbody.innerHTML = data.vehicles.map(v => `
      <tr style="cursor:pointer" onclick="showVehicleDetail(${JSON.stringify(v).replace(/"/g,"&quot;")})">
        <td>${v.vehicle_id}</td>
        <td><span class="badge badge-info">${v.vehicle_type || "—"}</span></td>
        <td>${v.license_plate || "—"}</td>
        <td>${v.confidence ? Math.round(v.confidence*100) + "%" : "—"}</td>
        <td>${(v.red_light_violation === "True" || v.red_light_violation === true)
              ? '<span class="badge badge-danger">VIOLATION</span>'
              : '<span class="badge badge-success">OK</span>'}</td>
        <td>${v.speed_kph || "—"}</td>
        <td>${v.frame_time ? v.frame_time+"s" : "—"}</td>
      </tr>
    `).join("");
  } catch (err) {}
}

function showVehicleDetail(v) {
  document.getElementById("modalTitle").textContent = `${v.vehicle_type ?? "Vehicle"} · ${v.license_plate || "No Plate"}`;
  const isViolation = v.red_light_violation === "True" || v.red_light_violation === true;
  document.getElementById("modalBody").innerHTML = `
    <div class="detail-row"><span class="detail-label">Vehicle ID</span><span>${v.vehicle_id}</span></div>
    <div class="detail-row"><span class="detail-label">Type</span><span>${v.vehicle_type || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Plate</span><span>${v.license_plate || "Not detected"}</span></div>
    <div class="detail-row"><span class="detail-label">Red Light</span><span class="badge ${isViolation ? "badge-danger" : "badge-success"}">${isViolation ? "VIOLATION" : "OK"}</span></div>
    ${v.license_plate ? `
    <div style="margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="quickReport('${v.license_plate}')">
        <i class="fas fa-file-alt"></i> Generate Report for this plate
      </button>
    </div>` : ""}
  `;
  document.getElementById("vehicleModal").style.display = "flex";
}

function closeModal(e) { if (e.target === document.getElementById("vehicleModal")) document.getElementById("vehicleModal").style.display = "none"; }

async function quickReport(plate) {
  document.getElementById("vehicleModal").style.display = "none";
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  document.querySelectorAll(".section").forEach(s  => s.classList.remove("active"));
  document.querySelector('[data-section="reports"]').classList.add("active");
  document.getElementById("reports").classList.add("active");
  document.getElementById("reportPlateInput").value = plate;
  await fetchReport(plate);
}

async function generateReport() {
  const plate = document.getElementById("reportPlateInput").value.trim().toUpperCase();
  if (!plate) { toast("Enter a license plate number", "error"); return; }
  await fetchReport(plate);
}

async function fetchReport(plate) {
  document.getElementById("reportEmpty").style.display  = "none";
  document.getElementById("reportResult").style.display = "none";
  document.getElementById("reportActions").style.display = "none";
  toast("Generating report…", "info");

  try {
    const r    = await fetch(`${API}/report/${encodeURIComponent(plate)}`);
    const data = await r.json();
    if (!r.ok) {
      toast(data.error || "No records found", "error");
      document.getElementById("reportEmpty").style.display = "block";
      return;
    }

    const resultEl   = document.getElementById("reportResult");
    
    // Fully restored detailed HTML block for the PDF!
    resultEl.innerHTML = `
      <h2 style="color:black;"><i class="fas fa-id-card" style="color:var(--accent);margin-right:10px"></i>${data.plate}</h2>
      <div class="report-grid" style="color:black; border: 1px solid #ccc; padding:10px; border-radius:8px;">
        <div class="report-stat">
          <div class="rv" style="font-size:24px; font-weight:bold;">${data.total_sightings}</div>
          <div class="rl" style="font-size:12px;">Total Sightings</div>
        </div>
        <div class="report-stat">
          <div class="rv" style="font-size:24px; font-weight:bold; color:${data.total_violations ? 'red' : 'green'}">
            ${data.total_violations}
          </div>
          <div class="rl" style="font-size:12px;">Violations</div>
        </div>
        <div class="report-stat">
          <div class="rv" style="font-size:16px;">${data.last_seen ? data.last_seen.slice(0,10) : "—"}</div>
          <div class="rl" style="font-size:12px;">Last Seen</div>
        </div>
      </div>
      
      ${data.ai_summary ? `
      <div class="ai-summary" style="margin-top:20px; padding:15px; background:#f9f9f9; border-left:4px solid #58a6ff; color:black;">
        <strong><i class="fas fa-robot"></i> AI Summary</strong><br/>
        ${data.ai_summary}
      </div>` : ""}
      
      <h3 style="margin-top:20px; margin-bottom:12px; color:black;">All Records</h3>
      <div class="table-wrapper" style="border: 1px solid #ddd;">
        <table style="width:100%; text-align:left; border-collapse: collapse; color:black;">
          <thead style="background:#eee;">
            <tr>
              <th style="padding:8px; border-bottom:1px solid #ccc;">Timestamp</th>
              <th style="padding:8px; border-bottom:1px solid #ccc;">Type</th>
              <th style="padding:8px; border-bottom:1px solid #ccc;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.records.map(rec => `
              <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;">${rec.timestamp?.slice(0,19) || "—"}</td>
                <td style="padding:8px; border-bottom:1px solid #eee;">${rec.vehicle_type || "—"}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; font-weight:bold; color:${(rec.red_light_violation === "True" || rec.red_light_violation === true) ? 'red' : 'green'};">
                  ${(rec.red_light_violation === "True" || rec.red_light_violation === true) ? 'VIOLATION' : 'OK'}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    
    resultEl.style.display = "block";
    document.getElementById("reportActions").style.display = "flex";
    toast("Report ready", "success");
  } catch (err) {
    toast(`Error: ${err.message}`, "error");
    document.getElementById("reportEmpty").style.display = "block";
  }
}

function printReport() {
  window.print();
}

function exportReportPDF() {
  const element = document.getElementById('reportResult');
  const plate = document.getElementById('reportPlateInput').value.trim().toUpperCase() || 'Vehicle';
  
  const opt = {
    margin:       0.5,
    filename:     `Traffic_Report_${plate}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  toast("Generating PDF... Please wait.", "info");
  
  html2pdf().set(opt).from(element).save().then(() => {
      toast("✅ PDF Downloaded Successfully!", "success");
  }).catch(err => {
      toast("❌ Error generating PDF", "error");
  });
}

async function loadDashboard() {
  try {
    const r = await fetch(`${API}/dashboard`);
    const data = await r.json();
    document.getElementById("d-total").textContent = data.total_vehicles_today;
    document.getElementById("d-violations").textContent = data.violations_today;
    document.getElementById("d-speed").textContent = `${data.avg_speed} km/h`;
  } catch (err) {}
}

async function exportCSV() { window.location.href = `${API}/export`; }

let toastTimer;
function toast(msg, type = "info") {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
  el.textContent = msg; el.className = type; el.style.display = "block";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.style.display = "none"; }, 4000);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024**2) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/1024**2).toFixed(1) + " MB";
}