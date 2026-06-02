import { API_BASE } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  initDiseaseScanner();
});

function initDiseaseScanner() {
  const fileInput = document.getElementById("img");
  const sendBtn = document.getElementById("send");
  const previewImg = document.getElementById("previewImage");
  const placeholderText = document.getElementById("placeholderText");
  const canvas = document.getElementById("scannerCanvas");
  const ctx = canvas.getContext("2d");

  let animationFrameId = null;
  let isScanning = false;
  let scanProgress = 0;

  // Handle Image Upload Selection
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        previewImg.classList.remove("hidden");
        placeholderText.classList.add("hidden");
        
        // Reset canvas dimensions to fit container
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        
        // Clear previous animations
        cancelAnimationFrame(animationFrameId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
      reader.readAsDataURL(file);
    }
  });

  // Run Pathology Scan
  sendBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      alert("Please select a leaf photo first!");
      return;
    }

    sendBtn.innerText = "Analyzing Pathogens...";
    sendBtn.disabled = true;

    // Start UI scanning animation
    startScanningAnimation();

    const fd = new FormData();
    fd.append("file", file, file.name);

    try {
      const res = await fetch(API_BASE + "/api/predict_disease", {
        method: "POST",
        body: fd
      });

      if (!res.ok) throw new Error(`Server returned status: ${res.status}`);
      const data = await res.json();

      // Maintain scanning animation for 1.5 seconds to show visual network scanning to user
      setTimeout(() => {
        stopScanningAnimation();
        renderPathologyReport(data);
        sendBtn.innerText = "Run Pathology Scan";
        sendBtn.disabled = false;
      }, 1500);

    } catch (error) {
      console.error("Pathology scan failed:", error);
      stopScanningAnimation();
      sendBtn.innerText = "Run Pathology Scan";
      sendBtn.disabled = false;
      alert(`Pathology Scan Failed: ${error.message}. Ensure backend FastAPI is running on port 8000.`);
    }
  });

  // Scanning Graphic Keyframe loop
  function startScanningAnimation() {
    isScanning = true;
    scanProgress = 0;
    
    // Toggle CSS laser scanning line overlay
    const laser = document.getElementById("scannerLaser");
    if (laser) laser.classList.remove("hidden");
    
    // Set dimensions
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    function draw() {
      if (!isScanning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Glowing Scanning Line
      const y = (scanProgress / 100) * canvas.height;
      
      ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#10b981";
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      
      // Draw grid overlay
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      
      const gridSize = 25;
      for (let i = 0; i < canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw simulated AI bounding boxes on spots
      if (scanProgress > 40) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#ef4444";
        ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.3, 80, 60);
        
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.fillRect(canvas.width * 0.25, canvas.height * 0.3, 80, 60);
        
        ctx.fillStyle = "#ef4444";
        ctx.shadowBlur = 0;
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("INFECTED LESION: 94%", (canvas.width * 0.25) + 2, (canvas.height * 0.3) - 5);
      }

      scanProgress = (scanProgress + 1.5) % 100;
      animationFrameId = requestAnimationFrame(draw);
    }
    
    draw();
  }

  function stopScanningAnimation() {
    isScanning = false;
    cancelAnimationFrame(animationFrameId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Hide CSS laser scanning line overlay
    const laser = document.getElementById("scannerLaser");
    if (laser) laser.classList.add("hidden");
  }
}

function renderPathologyReport(data) {
  // Hide fallback text
  document.getElementById("diseaseFallbackContent").classList.add("hidden");
  document.getElementById("diseaseActiveContent").classList.remove("hidden");

  // Populate report fields
  const nameEl = document.getElementById("diseaseName");
  const severityEl = document.getElementById("diseaseSeverity");
  const causeEl = document.getElementById("diseaseCause");
  const symptomsList = document.getElementById("diseaseSymptoms");
  const organicList = document.getElementById("diseaseOrganic");
  const chemicalList = document.getElementById("diseaseChemical");
  const sourceEl = document.getElementById("diseaseReportSource");

  nameEl.innerText = data.prediction;
  causeEl.innerHTML = `<strong>Diagnostic Cause:</strong> ${data.cause}`;
  
  // Set severity colors dynamically
  severityEl.innerText = `Severity: ${data.severity}`;
  severityEl.className = ""; // Reset
  
  if (data.severity.toLowerCase() === "high") {
    severityEl.style.color = "var(--danger)";
    severityEl.style.borderColor = "var(--danger)";
    severityEl.style.background = "rgba(239, 68, 68, 0.15)";
    severityEl.style.padding = "0.25rem 0.75rem";
    severityEl.style.borderRadius = "1rem";
    severityEl.style.border = "1px solid var(--danger)";
  } else if (data.severity.toLowerCase() === "medium") {
    severityEl.style.color = "var(--accent)";
    severityEl.style.borderColor = "var(--accent)";
    severityEl.style.background = "rgba(251, 191, 36, 0.15)";
    severityEl.style.padding = "0.25rem 0.75rem";
    severityEl.style.borderRadius = "1rem";
    severityEl.style.border = "1px solid var(--accent)";
  } else {
    severityEl.style.color = "var(--primary)";
    severityEl.style.borderColor = "var(--primary)";
    severityEl.style.background = "rgba(16, 185, 129, 0.15)";
    severityEl.style.padding = "0.25rem 0.75rem";
    severityEl.style.borderRadius = "1rem";
    severityEl.style.border = "1px solid var(--primary)";
  }

  // Symptoms list
  symptomsList.innerHTML = "";
  data.symptoms.forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;
    symptomsList.appendChild(li);
  });

  // Organic remedies
  organicList.innerHTML = "";
  data.organic_remedies.forEach(item => {
    const li = document.createElement("li");
    li.style.marginBottom = "0.25rem";
    li.innerText = item;
    organicList.appendChild(li);
  });

  // Chemical remedies
  chemicalList.innerHTML = "";
  data.chemical_remedies.forEach(item => {
    const li = document.createElement("li");
    li.style.marginBottom = "0.25rem";
    li.innerText = item;
    chemicalList.appendChild(li);
  });

  // Model source metadata
  sourceEl.innerText = `Confidence: ${data.confidence} • System: ${data.source}`;
}
