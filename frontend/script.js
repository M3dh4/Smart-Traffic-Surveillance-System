// Sample Data for the Application
const vehicleData = [
    {
        id: 1,
        plate: "ABC123",
        type: "car",
        typeName: "Sedan",
        color: "Blue",
        speed: 75,
        speedLimit: 60,
        violations: ["Speeding"],
        timestamp: "2023-10-15 10:15:23",
        location: "Main Street Intersection",
        image: "car-blue",
        status: "violation",
        make: "Toyota",
        model: "Camry",
        year: "2020"
    },
    {
        id: 2,
        plate: "XYZ789",
        type: "suv",
        typeName: "SUV",
        color: "Black",
        speed: 55,
        speedLimit: 60,
        violations: [],
        timestamp: "2023-10-15 10:18:47",
        location: "Highway Exit 5",
        image: "suv-black",
        status: "clean",
        make: "Honda",
        model: "CR-V",
        year: "2019"
    },
    {
        id: 3,
        plate: "DEF456",
        type: "truck",
        typeName: "Truck",
        color: "Red",
        speed: 68,
        speedLimit: 60,
        violations: ["Speeding", "Overloaded"],
        timestamp: "2023-10-15 10:22:11",
        location: "Industrial Zone",
        image: "truck-red",
        status: "violation",
        make: "Ford",
        model: "F-150",
        year: "2018"
    },
    {
        id: 4,
        plate: "GHI789",
        type: "motorcycle",
        typeName: "Motorcycle",
        color: "White",
        speed: 85,
        speedLimit: 60,
        violations: ["Speeding", "No Helmet", "Lane Splitting"],
        timestamp: "2023-10-15 10:25:39",
        location: "Main Street Intersection",
        image: "motorcycle-white",
        status: "violation",
        make: "Harley-Davidson",
        model: "Sportster",
        year: "2021"
    },
    {
        id: 5,
        plate: "JKL012",
        type: "van",
        typeName: "Van",
        color: "Gray",
        speed: 58,
        speedLimit: 60,
        violations: [],
        timestamp: "2023-10-15 10:28:05",
        location: "North Bridge",
        image: "van-gray",
        status: "clean",
        make: "Mercedes",
        model: "Sprinter",
        year: "2020"
    },
    {
        id: 6,
        plate: "MNO345",
        type: "bus",
        typeName: "Bus",
        color: "Yellow",
        speed: 50,
        speedLimit: 60,
        violations: [],
        timestamp: "2023-10-15 10:31:22",
        location: "Bus Terminal",
        image: "bus-yellow",
        status: "clean",
        make: "Volvo",
        model: "B8R",
        year: "2019"
    },
    {
        id: 7,
        plate: "PQR678",
        type: "car",
        typeName: "Sports Car",
        color: "Silver",
        speed: 95,
        speedLimit: 60,
        violations: ["Speeding", "Red Light Violation", "Reckless Driving"],
        timestamp: "2023-10-15 10:35:14",
        location: "Main Street Intersection",
        image: "car-silver",
        status: "violation",
        make: "Porsche",
        model: "911",
        year: "2022"
    },
    {
        id: 8,
        plate: "STU901",
        type: "suv",
        typeName: "SUV",
        color: "Green",
        speed: 62,
        speedLimit: 60,
        violations: ["Speeding"],
        timestamp: "2023-10-15 10:38:47",
        location: "West Avenue",
        image: "suv-green",
        status: "violation",
        make: "Jeep",
        model: "Grand Cherokee",
        year: "2021"
    },
    {
        id: 9,
        plate: "VWX234",
        type: "car",
        typeName: "Hatchback",
        color: "White",
        speed: 57,
        speedLimit: 60,
        violations: [],
        timestamp: "2023-10-15 10:42:19",
        location: "South Park Road",
        image: "car-white",
        status: "clean",
        make: "Volkswagen",
        model: "Golf",
        year: "2020"
    },
    {
        id: 10,
        plate: "YZA567",
        type: "truck",
        typeName: "Delivery Truck",
        color: "Blue",
        speed: 65,
        speedLimit: 60,
        violations: ["Speeding", "Improper Lane Change"],
        timestamp: "2023-10-15 10:46:33",
        location: "Commercial District",
        image: "truck-blue",
        status: "violation",
        make: "Isuzu",
        model: "NQR",
        year: "2019"
    }
];

// DOM Elements
let currentPage = 'upload';
let processingInterval;
let progressInterval;
let timerInterval;
let selectedFiles = [];
let filteredVehicles = [...vehicleData];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initNavigation();
    
    // Initialize upload functionality
    initUpload();
    
    // Initialize processing simulation
    initProcessing();
    
    // Initialize output page
    initOutputPage();
    
    // Initialize report page
    initReportPage();
    
    // Initialize dashboard
    initDashboard();
    
    // Initialize modals and loading
    initModals();
    
    // Set current time for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-to').value = today;
    
    // Set default date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    document.getElementById('date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
});

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Update active nav link
            navLinks.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected page
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(`${pageId}-page`).classList.add('active');
            
            // Update current page
            currentPage = pageId;
            
            // Update page-specific content
            if (pageId === 'output') {
                updateVehicleDisplay();
            } else if (pageId === 'dashboard') {
                updateDashboard();
            }
        });
    });
}

// Upload functionality
function initUpload() {
    const uploadArea = document.getElementById('upload-area');
    const browseBtn = document.getElementById('browse-btn');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const filesList = document.getElementById('files-list');
    const startProcessingBtn = document.getElementById('start-processing');
    const clearFilesBtn = document.getElementById('clear-files');
    const optionCards = document.querySelectorAll('.option-card');
    
    // Option cards selection
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            optionCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Browse button click
    browseBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Upload area click
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files.length > 0) {
            handleFiles(this.files);
        }
    });
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--primary-color)';
        this.style.backgroundColor = 'rgba(37, 99, 235, 0.02)';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--gray-light)';
        this.style.backgroundColor = '';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--gray-light)';
        this.style.backgroundColor = '';
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Start processing button
    startProcessingBtn.addEventListener('click', function() {
        if (selectedFiles.length === 0) {
            alert('Please select files to process.');
            return;
        }
        
        // Show loading spinner
        document.getElementById('loading-spinner').classList.add('active');
        
        // Simulate processing delay
        setTimeout(() => {
            document.getElementById('loading-spinner').classList.remove('active');
            
            // Switch to processing page
            document.querySelector('.nav-link[data-page="processing"]').click();
            
            // Start processing simulation
            simulateProcessing();
        }, 1500);
    });
    
    // Clear files button
    clearFilesBtn.addEventListener('click', function() {
        selectedFiles = [];
        filesList.innerHTML = '';
        filePreview.style.display = 'none';
        fileInput.value = '';
    });
    
    // Handle selected files
    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Validate file size (max 2GB)
            if (file.size > 2 * 1024 * 1024 * 1024) {
                alert(`File "${file.name}" exceeds 2GB limit. Please select a smaller file.`);
                continue;
            }
            
            // Validate file type
            const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert(`File "${file.name}" is not a supported format. Please select a video or image file.`);
                continue;
            }
            
            // Add to selected files if not already there
            if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
            }
        }
        
        updateFilesList();
    }
    
    // Update files list display
    function updateFilesList() {
        filesList.innerHTML = '';
        
        if (selectedFiles.length === 0) {
            filePreview.style.display = 'none';
            return;
        }
        
        filePreview.style.display = 'block';
        
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileIcon = file.type.startsWith('video') ? 'fas fa-video' : 'fas fa-image';
            const fileSize = formatFileSize(file.size);
            
            fileItem.innerHTML = `
                <div class="file-info-small">
                    <i class="${fileIcon}"></i>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${fileSize} • ${file.type}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-icon" onclick="removeFile(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            filesList.appendChild(fileItem);
        });
    }
    
    // Format file size
    window.formatFileSize = function(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // Remove file from list
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFilesList();
    };
}

// Processing simulation
function initProcessing() {
    const pauseBtn = document.getElementById('pause-processing');
    const stopBtn = document.getElementById('stop-processing');
    const resultsBtn = document.getElementById('results-btn');
    
    // Pause button
    pauseBtn.addEventListener('click', function() {
        if (this.innerHTML.includes('Pause')) {
            clearInterval(progressInterval);
            clearInterval(timerInterval);
            this.innerHTML = '<i class="fas fa-play"></i> Resume';
        } else {
            simulateProcessing();
            this.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }
    });
    
    // Stop button
    stopBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to stop processing?')) {
            clearInterval(progressInterval);
            clearInterval(timerInterval);
            document.getElementById('progress-fill').style.width = '0%';
            document.getElementById('progress-percent').textContent = '0%';
            document.getElementById('timer').textContent = '00:00';
            
            // Reset steps
            document.querySelectorAll('.step').forEach(step => {
                step.classList.remove('completed', 'active');
            });
            document.getElementById('step1').classList.add('completed');
            document.getElementById('step2').classList.add('active');
            
            // Reset counters
            document.getElementById('vehicles-count').textContent = '0';
            document.getElementById('plates-count').textContent = '0';
            document.getElementById('violations-count').textContent = '0';
            document.getElementById('avg-speed').textContent = '0 km/h';
            
            // Switch to upload page
            document.querySelector('.nav-link[data-page="upload"]').click();
        }
    });
    
    // Results button
    resultsBtn.addEventListener('click', function() {
        document.querySelector('.nav-link[data-page="output"]').click();
    });
}

// Simulate processing
function simulateProcessing() {
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const timer = document.getElementById('timer');
    const resultsBtn = document.getElementById('results-btn');
    const steps = document.querySelectorAll('.step');
    
    let progress = 0;
    let seconds = 0;
    let vehiclesCount = 0;
    let platesCount = 0;
    let violationsCount = 0;
    let totalSpeed = 0;
    
    // Reset steps
    steps.forEach(step => {
        step.classList.remove('completed', 'active');
    });
    
    // Start with step 1 completed
    document.getElementById('step1').classList.add('completed');
    document.getElementById('step2').classList.add('active');
    
    // Clear any existing intervals
    if (progressInterval) clearInterval(progressInterval);
    if (timerInterval) clearInterval(timerInterval);
    
    // Timer function
    timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
    
    // Progress simulation
    progressInterval = setInterval(() => {
        progress += Math.random() * 3;
        if (progress > 100) progress = 100;
        
        progressFill.style.width = `${progress}%`;
        progressPercent.textContent = `${Math.round(progress)}%`;
        
        // Simulate vehicle detection
        if (progress > 10 && progress < 40) {
            vehiclesCount = Math.floor(progress * 0.8);
            document.getElementById('vehicles-count').textContent = vehiclesCount;
            
            // Update step 2 progress
            const step2Progress = ((progress - 10) / 30) * 100;
            document.querySelector('#step2 .step-progress-fill').style.width = `${step2Progress}%`;
        }
        
        // Simulate plate recognition
        if (progress >= 40 && progress < 60) {
            platesCount = Math.floor((progress - 40) * 2);
            document.getElementById('plates-count').textContent = platesCount;
            
            // Update steps
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').classList.add('completed');
            document.getElementById('step3').classList.add('active');
        }
        
        // Simulate vehicle classification
        if (progress >= 60 && progress < 80) {
            // Update steps
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step3').classList.add('completed');
            document.getElementById('step4').classList.add('active');
            
            // Simulate average speed
            totalSpeed = 40 + Math.floor(Math.random() * 40);
            document.getElementById('avg-speed').textContent = `${totalSpeed} km/h`;
        }
        
        // Simulate violation detection
        if (progress >= 80) {
            violationsCount = Math.floor((progress - 80) * 4);
            document.getElementById('violations-count').textContent = violationsCount;
            
            // Update steps
            document.getElementById('step4').classList.remove('active');
            document.getElementById('step4').classList.add('completed');
            document.getElementById('step5').classList.add('active');
        }
        
        // When progress reaches 100%
        if (progress >= 100) {
            clearInterval(progressInterval);
            clearInterval(timerInterval);
            
            // Complete all steps
            document.getElementById('step5').classList.remove('active');
            document.getElementById('step5').classList.add('completed');
            
            // Enable results button
            resultsBtn.disabled = false;
            resultsBtn.style.opacity = '1';
            
            // Final counts
            document.getElementById('vehicles-count').textContent = '12';
            document.getElementById('plates-count').textContent = '10';
            document.getElementById('violations-count').textContent = '6';
            document.getElementById('avg-speed').textContent = '62 km/h';
        }
    }, 200);
}

// Output page functionality
function initOutputPage() {
    const searchInput = document.getElementById('search-vehicle');
    const filterType = document.getElementById('filter-type');
    const filterViolation = document.getElementById('filter-violation');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const exportBtn = document.getElementById('export-btn');
    const viewButtons = document.querySelectorAll('.view-btn');
    const closeDetailsBtn = document.getElementById('close-details');
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        filterVehicles();
    });
    
    // Filter type change
    filterType.addEventListener('change', function() {
        filterVehicles();
    });
    
    // Filter violation change
    filterViolation.addEventListener('change', function() {
        filterVehicles();
    });
    
    // Speed slider
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = `0-${this.value} km/h`;
        filterVehicles();
    });
    
    // Apply filters button
    applyFiltersBtn.addEventListener('click', function() {
        filterVehicles();
    });
    
    // Export button
    exportBtn.addEventListener('click', function() {
        exportVehicleData();
    });
    
    // View buttons (grid/list)
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.getAttribute('data-view');
            const vehiclesGrid = document.getElementById('vehicles-grid');
            
            if (view === 'list') {
                vehiclesGrid.classList.add('list-view');
            } else {
                vehiclesGrid.classList.remove('list-view');
            }
        });
    });
    
    // Close details panel
    closeDetailsBtn.addEventListener('click', function() {
        document.getElementById('vehicle-details').classList.remove('active');
    });
    
    // Initial display
    updateVehicleDisplay();
}

// Filter vehicles based on criteria
function filterVehicles() {
    const searchTerm = document.getElementById('search-vehicle').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;
    const filterViolation = document.getElementById('filter-violation').value;
    const maxSpeed = parseInt(document.getElementById('speed-slider').value);
    
    filteredVehicles = vehicleData.filter(vehicle => {
        // Search filter
        if (searchTerm && !vehicle.plate.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // Type filter
        if (filterType !== 'all' && vehicle.type !== filterType) {
            return false;
        }
        
        // Violation filter
        if (filterViolation === 'violation' && vehicle.violations.length === 0) {
            return false;
        }
        if (filterViolation === 'clean' && vehicle.violations.length > 0) {
            return false;
        }
        
        // Speed filter
        if (vehicle.speed > maxSpeed) {
            return false;
        }
        
        return true;
    });
    
    updateVehicleDisplay();
}

// Update vehicle display
function updateVehicleDisplay() {
    const vehiclesGrid = document.getElementById('vehicles-grid');
    const totalVehicles = document.getElementById('total-vehicles');
    const violationStat = document.querySelector('.violation-stat');
    
    // Clear grid
    vehiclesGrid.innerHTML = '';
    
    // Update statistics
    totalVehicles.textContent = filteredVehicles.length;
    
    const violationsCount = filteredVehicles.filter(v => v.violations.length > 0).length;
    violationStat.textContent = violationsCount;
    
    // Calculate average speed
    if (filteredVehicles.length > 0) {
        const avgSpeed = filteredVehicles.reduce((sum, v) => sum + v.speed, 0) / filteredVehicles.length;
        document.querySelectorAll('.stat-value')[2].textContent = `${Math.round(avgSpeed)} km/h`;
    }
    
    // Add vehicle cards
    filteredVehicles.forEach(vehicle => {
        const vehicleCard = createVehicleCard(vehicle);
        vehiclesGrid.appendChild(vehicleCard);
    });
    
    // If no vehicles found
    if (filteredVehicles.length === 0) {
        vehiclesGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-car"></i>
                <h3>No Vehicles Found</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
    }
}

// Create vehicle card element
function createVehicleCard(vehicle) {
    const card = document.createElement('div');
    card.className = `vehicle-card ${vehicle.status}`;
    
    const violationBadge = vehicle.violations.length > 0 
        ? `<div class="violation-badge">${vehicle.violations.length} violation${vehicle.violations.length > 1 ? 's' : ''}</div>`
        : '';
    
    const iconClass = getVehicleIcon(vehicle.type);
    
    card.innerHTML = `
        <div class="vehicle-image" style="background: ${getVehicleColor(vehicle.color)}">
            <i class="${iconClass}"></i>
        </div>
        <div class="vehicle-info">
            <div class="vehicle-header">
                <div class="vehicle-plate">${vehicle.plate}</div>
                <div class="vehicle-type">${vehicle.typeName}</div>
            </div>
            <div class="vehicle-details-list">
                <div class="detail-row">
                    <span class="detail-label">Color</span>
                    <span class="detail-value">${vehicle.color}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Speed</span>
                    <span class="detail-value ${vehicle.speed > vehicle.speedLimit ? 'violation-stat' : ''}">
                        ${vehicle.speed} km/h
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Limit</span>
                    <span class="detail-value">${vehicle.speedLimit} km/h</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Time</span>
                    <span class="detail-value">${vehicle.timestamp.split(' ')[1]}</span>
                </div>
            </div>
            ${violationBadge}
            <div class="vehicle-actions">
                <button class="btn btn-secondary btn-sm" onclick="showVehicleDetails(${vehicle.id})">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="btn btn-primary btn-sm" onclick="generateReportForVehicle('${vehicle.plate}')">
                    <i class="fas fa-file-alt"></i> Report
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Get vehicle icon class
function getVehicleIcon(type) {
    const icons = {
        car: 'fas fa-car',
        suv: 'fas fa-truck',
        truck: 'fas fa-truck-moving',
        motorcycle: 'fas fa-motorcycle',
        bus: 'fas fa-bus',
        van: 'fas fa-shuttle-van'
    };
    
    return icons[type] || 'fas fa-car';
}

// Get vehicle color for display
function getVehicleColor(color) {
    const colors = {
        Blue: 'linear-gradient(45deg, #3b82f6 0%, #1d4ed8 100%)',
        Black: 'linear-gradient(45deg, #4b5563 0%, #1f2937 100%)',
        Red: 'linear-gradient(45deg, #ef4444 0%, #dc2626 100%)',
        White: 'linear-gradient(45deg, #f3f4f6 0%, #d1d5db 100%)',
        Gray: 'linear-gradient(45deg, #9ca3af 0%, #6b7280 100%)',
        Silver: 'linear-gradient(45deg, #e5e7eb 0%, #9ca3af 100%)',
        Green: 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
        Yellow: 'linear-gradient(45deg, #fbbf24 0%, #d97706 100%)'
    };
    
    return colors[color] || 'linear-gradient(45deg, #3b82f6 0%, #1d4ed8 100%)';
}

// Show vehicle details
window.showVehicleDetails = function(vehicleId) {
    const vehicle = vehicleData.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const detailsContent = document.getElementById('details-content');
    const violationsList = vehicle.violations.map(v => `<li>${v}</li>`).join('');
    
    detailsContent.innerHTML = `
        <div class="vehicle-detail-header">
            <div class="detail-plate">${vehicle.plate}</div>
            <div class="detail-type">${vehicle.typeName}</div>
        </div>
        
        <div class="detail-section">
            <h4>Vehicle Information</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Make</span>
                    <span class="detail-value">${vehicle.make}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Model</span>
                    <span class="detail-value">${vehicle.model}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Year</span>
                    <span class="detail-value">${vehicle.year}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Color</span>
                    <span class="detail-value">${vehicle.color}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Detection Details</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Detected Speed</span>
                    <span class="detail-value ${vehicle.speed > vehicle.speedLimit ? 'violation-stat' : ''}">
                        ${vehicle.speed} km/h
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Speed Limit</span>
                    <span class="detail-value">${vehicle.speedLimit} km/h</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Over Speed</span>
                    <span class="detail-value ${vehicle.speed > vehicle.speedLimit ? 'violation-stat' : ''}">
                        ${vehicle.speed - vehicle.speedLimit} km/h
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Detection Time</span>
                    <span class="detail-value">${vehicle.timestamp}</span>
                </div>
                <div class="detail-item full-width">
                    <span class="detail-label">Location</span>
                    <span class="detail-value">${vehicle.location}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Violations</h4>
            ${vehicle.violations.length > 0 
                ? `<ul class="violations-list">${violationsList}</ul>` 
                : '<p class="no-violations">No violations detected</p>'}
        </div>
        
        <div class="detail-actions">
            <button class="btn btn-primary" onclick="generateReportForVehicle('${vehicle.plate}')">
                <i class="fas fa-file-pdf"></i> Generate Report
            </button>
            <button class="btn btn-secondary" onclick="showVehicleImage('${vehicle.plate}')">
                <i class="fas fa-image"></i> View Image
            </button>
        </div>
    `;
    
    // Show details panel
    document.getElementById('vehicle-details').classList.add('active');
};

// Export vehicle data
function exportVehicleData() {
    const dataStr = JSON.stringify(filteredVehicles, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehicle-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Vehicle data exported successfully!');
}

// Report page functionality
function initReportPage() {
    const searchReportBtn = document.getElementById('search-report');
    const reportPlateInput = document.getElementById('report-plate');
    const printReportBtn = document.getElementById('print-report');
    const exportReportBtn = document.getElementById('export-report');
    const emailReportBtn = document.getElementById('email-report');
    
    // Search report
    searchReportBtn.addEventListener('click', function() {
        const plate = reportPlateInput.value.trim().toUpperCase();
        if (plate) {
            generateReport(plate);
        } else {
            alert('Please enter a license plate number.');
        }
    });
    
    // Enter key for search
    reportPlateInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchReportBtn.click();
        }
    });
    
    // Print report
    printReportBtn.addEventListener('click', function() {
        window.print();
    });
    
    // Export report as PDF
    exportReportBtn.addEventListener('click', function() {
        alert('PDF export functionality would be implemented here with a PDF library.');
    });
    
    // Email report
    emailReportBtn.addEventListener('click', function() {
        const email = prompt('Enter email address to send the report:');
        if (email) {
            alert(`Report would be sent to ${email}`);
        }
    });
}

// Generate report for a vehicle
function generateReport(plate) {
    const reportContent = document.getElementById('report-content');
    const noResults = document.getElementById('no-results');
    const reportResults = document.getElementById('report-results');
    
    // Find vehicles with matching plate (partial match)
    const matchingVehicles = vehicleData.filter(vehicle => 
        vehicle.plate.includes(plate)
    );
    
    if (matchingVehicles.length === 0) {
        reportContent.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    // Calculate statistics
    const totalDetections = matchingVehicles.length;
    const totalViolations = matchingVehicles.reduce((sum, vehicle) => sum + vehicle.violations.length, 0);
    const speedingCount = matchingVehicles.filter(v => v.violations.includes("Speeding")).length;
    const avgSpeed = matchingVehicles.reduce((sum, vehicle) => sum + vehicle.speed, 0) / matchingVehicles.length;
    
    // Get date range
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    // Generate report HTML
    reportContent.innerHTML = `
        <div class="report-header">
            <h2>Vehicle Traffic Report</h2>
            <div class="report-plate">${plate}</div>
            <p>Report Period: ${dateFrom} to ${dateTo}</p>
        </div>
        
        <div class="report-stats">
            <div class="report-stat-card">
                <i class="fas fa-search"></i>
                <div class="report-stat-value">${totalDetections}</div>
                <div class="report-stat-label">Total Detections</div>
            </div>
            <div class="report-stat-card">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="report-stat-value">${totalViolations}</div>
                <div class="report-stat-label">Total Violations</div>
            </div>
            <div class="report-stat-card">
                <i class="fas fa-tachometer-alt"></i>
                <div class="report-stat-value">${Math.round(avgSpeed)}</div>
                <div class="report-stat-label">Avg Speed (km/h)</div>
            </div>
            <div class="report-stat-card">
                <i class="fas fa-percentage"></i>
                <div class="report-stat-value">${Math.round((speedingCount / totalDetections) * 100)}%</div>
                <div class="report-stat-label">Speeding Rate</div>
            </div>
        </div>
        
        <div class="violations-list">
            <h3>Violation History</h3>
            ${matchingVehicles.filter(v => v.violations.length > 0).map(vehicle => `
                <div class="violation-item">
                    <div class="violation-header">
                        <span class="violation-type">${vehicle.violations.join(', ')}</span>
                        <span class="violation-time">${vehicle.timestamp}</span>
                    </div>
                    <p>Location: ${vehicle.location} | Speed: ${vehicle.speed} km/h (Limit: ${vehicle.speedLimit} km/h)</p>
                </div>
            `).join('')}
            
            ${matchingVehicles.filter(v => v.violations.length === 0).length > 0 ? 
                `<p class="no-violations-msg">${matchingVehicles.filter(v => v.violations.length === 0).length} detections with no violations</p>` 
                : ''}
        </div>
        
        <div class="detection-history">
            <h3>Detection History</h3>
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Location</th>
                            <th>Speed</th>
                            <th>Violations</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matchingVehicles.map(vehicle => `
                            <tr>
                                <td>${vehicle.timestamp}</td>
                                <td>${vehicle.location}</td>
                                <td>${vehicle.speed} km/h</td>
                                <td>${vehicle.violations.length > 0 ? vehicle.violations.join(', ') : 'None'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    reportContent.style.display = 'block';
    noResults.style.display = 'none';
    
    // Scroll to report results
    reportResults.scrollIntoView({ behavior: 'smooth' });
}

// Generate report for specific vehicle from output page
window.generateReportForVehicle = function(plate) {
    // Switch to report page
    document.querySelector('.nav-link[data-page="report"]').click();
    
    // Set plate and generate report
    document.getElementById('report-plate').value = plate;
    setTimeout(() => {
        document.getElementById('search-report').click();
    }, 100);
};

// Dashboard functionality
function initDashboard() {
    // This would initialize charts and update dashboard data
    // For simplicity, we'll just update the tables
    updateDashboard();
}

// Update dashboard data
function updateDashboard() {
    // Update violations table
    const violationsTable = document.getElementById('violations-table');
    const recentViolations = vehicleData
        .filter(v => v.violations.length > 0)
        .slice(0, 5);
    
    violationsTable.innerHTML = recentViolations.map(vehicle => `
        <tr>
            <td>${vehicle.timestamp.split(' ')[1]}</td>
            <td>${vehicle.plate}</td>
            <td>${vehicle.violations[0]}</td>
            <td>${vehicle.speed} km/h</td>
            <td>${vehicle.location}</td>
        </tr>
    `).join('');
    
    // Update violators table
    const violatorsTable = document.getElementById('violators-table');
    const violators = {};
    
    vehicleData.forEach(vehicle => {
        if (vehicle.violations.length > 0) {
            if (!violators[vehicle.plate]) {
                violators[vehicle.plate] = {
                    violations: 0,
                    lastSeen: vehicle.timestamp
                };
            }
            violators[vehicle.plate].violations += vehicle.violations.length;
            if (new Date(vehicle.timestamp) > new Date(violators[vehicle.plate].lastSeen)) {
                violators[vehicle.plate].lastSeen = vehicle.timestamp;
            }
        }
    });
    
    const topViolators = Object.entries(violators)
        .map(([plate, data]) => ({ plate, ...data }))
        .sort((a, b) => b.violations - a.violations)
        .slice(0, 5);
    
    violatorsTable.innerHTML = topViolators.map(violator => `
        <tr>
            <td>${violator.plate}</td>
            <td>${violator.violations} violations</td>
            <td>${violator.lastSeen.split(' ')[0]}</td>
            <td><span class="status-badge status-warning">Active</span></td>
        </tr>
    `).join('');
    
    // Create simple charts (for demo purposes)
    createCharts();
}

// Create simple charts for dashboard
function createCharts() {
    // Violations by type chart
    const violationsChart = document.getElementById('violations-chart');
    const violationsByType = {
        'Speeding': vehicleData.filter(v => v.violations.includes('Speeding')).length,
        'Red Light': vehicleData.filter(v => v.violations.includes('Red Light Violation')).length,
        'No Helmet': vehicleData.filter(v => v.violations.includes('No Helmet')).length,
        'Other': vehicleData.filter(v => v.violations.some(viol => 
            !['Speeding', 'Red Light Violation', 'No Helmet'].includes(viol)
        )).length
    };
    
    // Create a simple bar chart visualization
    let violationsHtml = '<div class="chart-bars">';
    Object.entries(violationsByType).forEach(([type, count]) => {
        const height = (count / Math.max(...Object.values(violationsByType))) * 100;
        violationsHtml += `
            <div class="chart-bar-container">
                <div class="chart-bar" style="height: ${height}%"></div>
                <div class="chart-label">${type}</div>
                <div class="chart-value">${count}</div>
            </div>
        `;
    });
    violationsHtml += '</div>';
    violationsChart.innerHTML = violationsHtml;
    
    // Traffic volume by hour chart
    const trafficChart = document.getElementById('traffic-chart');
    // Simulate traffic data for each hour
    let trafficHtml = '<div class="chart-bars">';
    for (let hour = 7; hour <= 19; hour++) {
        const count = Math.floor(Math.random() * 30) + 10;
        const height = (count / 40) * 100;
        trafficHtml += `
            <div class="chart-bar-container">
                <div class="chart-bar" style="height: ${height}%"></div>
                <div class="chart-label">${hour}:00</div>
                <div class="chart-value">${count}</div>
            </div>
        `;
    }
    trafficHtml += '</div>';
    trafficChart.innerHTML = trafficHtml;
    
    // Add chart styles
    const style = document.createElement('style');
    style.textContent = `
        .chart-bars {
            display: flex;
            height: 100%;
            align-items: flex-end;
            justify-content: space-around;
            padding: 20px;
        }
        .chart-bar-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
            width: 40px;
        }
        .chart-bar {
            width: 30px;
            background-color: var(--primary-color);
            border-radius: 4px 4px 0 0;
            transition: height 0.5s ease;
        }
        .chart-label {
            margin-top: 10px;
            font-size: 0.8rem;
            color: var(--text-light);
            text-align: center;
        }
        .chart-value {
            margin-top: 5px;
            font-size: 0.9rem;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
}

// Modal functionality
function initModals() {
    const closeModalBtn = document.getElementById('close-modal');
    const modal = document.getElementById('image-modal');
    
    // Close modal
    closeModalBtn.addEventListener('click', function() {
        modal.classList.remove('active');
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Show vehicle image in modal
window.showVehicleImage = function(plate) {
    const vehicle = vehicleData.find(v => v.plate === plate);
    if (!vehicle) return;
    
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalInfo = document.getElementById('modal-info');
    
    // In a real application, this would show the actual vehicle image
    // For demo, we'll use a placeholder
    modalImage.src = `https://via.placeholder.com/600x400/${getColorHex(vehicle.color)}/FFFFFF?text=${vehicle.plate}+${vehicle.typeName}`;
    
    modalInfo.innerHTML = `
        <h4>${vehicle.plate} - ${vehicle.typeName}</h4>
        <p>Color: ${vehicle.color} | Speed: ${vehicle.speed} km/h</p>
        <p>Detected: ${vehicle.timestamp}</p>
        <p>Location: ${vehicle.location}</p>
    `;
    
    modal.classList.add('active');
};

// Helper function to get color hex
function getColorHex(color) {
    const colors = {
        Blue: '3b82f6',
        Black: '000000',
        Red: 'ef4444',
        White: 'ffffff',
        Gray: '9ca3af',
        Silver: 'e5e7eb',
        Green: '10b981',
        Yellow: 'fbbf24'
    };
    
    return colors[color] || '3b82f6';
}

// Utility function to show loading
function showLoading() {
    document.getElementById('loading-spinner').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-spinner').classList.remove('active');
}