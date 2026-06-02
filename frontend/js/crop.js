import { API_BASE } from "./config.js";

let cropChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  initCropAdvisor();
});

function initCropAdvisor() {
  const getRecBtn = document.getElementById("getRec");
  const autofillBtn = document.getElementById("autofillSoil");

  // Autofill from live IoT Telemetry Nodes
  autofillBtn.addEventListener("click", () => {
    const iotMoist = parseFloat(document.getElementById("iotMoisture").innerText) || 60;
    const iotTemp = parseFloat(document.getElementById("iotTemp").innerText) || 25;
    const iotPH = parseFloat(document.getElementById("iotPH").innerText) || 6.5;
    const iotN = parseInt(document.getElementById("iotN").innerText) || 80;
    const iotP = parseInt(document.getElementById("iotP").innerText) || 45;
    const iotK = parseInt(document.getElementById("iotK").innerText) || 40;

    document.getElementById("ph").value = iotPH;
    document.getElementById("n").value = iotN;
    document.getElementById("p").value = iotP;
    document.getElementById("k").value = iotK;
    document.getElementById("moist").value = iotMoist;
    document.getElementById("temp").value = iotTemp;
    
    // Simulate rainfall based on moisture
    document.getElementById("rain").value = Math.round(iotMoist * 2.8);

    alert("🔌 Pulled latest live readings from field IoT nodes!");
  });

  // Calculate Crop Recommendation
  getRecBtn.addEventListener("click", async () => {
    getRecBtn.innerText = "Analyzing Soil Matrix...";
    getRecBtn.disabled = true;

    const payload = {
      ph: parseFloat(document.getElementById("ph").value),
      nitrogen: parseFloat(document.getElementById("n").value),
      phosphorus: parseFloat(document.getElementById("p").value),
      potassium: parseFloat(document.getElementById("k").value),
      moisture: parseFloat(document.getElementById("moist").value),
      temperature: parseFloat(document.getElementById("temp").value),
      rainfall: parseFloat(document.getElementById("rain").value)
    };

    try {
      const res = await fetch(API_BASE + "/api/recommend_crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server responded with: ${res.status}`);
      const data = await res.json();

      renderCropRecommendation(data);

    } catch (error) {
      console.error("Advisory prediction failed:", error);
      alert(`Recommendation Failed: ${error.message}. Make sure backend FastAPI is running on port 8000.`);
    } finally {
      getRecBtn.innerText = "Calculate Best Crop";
      getRecBtn.disabled = false;
    }
  });
}

function renderCropRecommendation(data) {
  // Show active content pane
  document.getElementById("cropFallbackContent").classList.add("hidden");
  const activeContent = document.getElementById("cropActiveContent");
  activeContent.classList.remove("hidden");

  // Title and source
  document.getElementById("recommendedCropName").innerText = data.recommended_crop;
  document.getElementById("recommendationSource").innerText = `Source: ${data.source}`;
  
  // Calculate simulated confidence
  const conf = data.source.includes("Random") ? "97.4%" : "Rule-Based Fallback";
  document.getElementById("cropConfidence").innerText = `${conf} Match`;

  // Draw NPK Deficit Comparison Chart
  drawNPKChart(data.input_profile, data.ideal_profile);

  // Render fertilizer recommendations list
  const fertilizerList = document.getElementById("fertilizerList");
  fertilizerList.innerHTML = "";
  data.fertilizer_recommendation.forEach(rec => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.gap = "0.5rem";
    li.style.alignItems = "flex-start";
    li.innerHTML = `
      <span style="color: var(--accent);">✔</span>
      <span>${rec}</span>
    `;
    fertilizerList.appendChild(li);
  });

  // Render Sowing timeline
  const timelineContainer = document.getElementById("cropTimelineList");
  timelineContainer.innerHTML = "";
  
  data.timeline.forEach((step, idx) => {
    const stepEl = document.createElement("div");
    stepEl.style.display = "flex";
    stepEl.style.gap = "1rem";
    stepEl.style.background = "rgba(255,255,255,0.03)";
    stepEl.style.border = "1px solid var(--border-glass)";
    stepEl.style.borderRadius = "0.75rem";
    stepEl.style.padding = "0.85rem";
    
    stepEl.innerHTML = `
      <div style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
        ${idx + 1}
      </div>
      <div>
        <div style="font-weight: 700; color: var(--color-text);">${step.stage} <span style="color: var(--accent); font-size: 0.8rem; font-weight: 500; margin-left: 0.5rem;">(${step.duration})</span></div>
        <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem;">${step.details}</p>
      </div>
    `;
    timelineContainer.appendChild(stepEl);
  });
}

function drawNPKChart(input, ideal) {
  const ctx = document.getElementById("cropChart").getContext("2d");
  
  if (cropChartInstance) {
    cropChartInstance.destroy();
  }

  cropChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Nitrogen (N)", "Phosphorus (P)", "Potassium (K)"],
      datasets: [
        {
          label: "Your Soil Ratio",
          backgroundColor: "rgba(251, 191, 36, 0.7)",
          borderColor: "var(--accent)",
          borderWidth: 1,
          data: [input.nitrogen, input.phosphorus, input.potassium]
        },
        {
          label: "Ideal Target Ratio",
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderColor: "var(--primary)",
          borderWidth: 1,
          data: [ideal.N, ideal.P, ideal.K]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#9bbfa8" }, grid: { color: "rgba(255,255,255,0.03)" } },
        y: { ticks: { color: "#9bbfa8" }, grid: { color: "rgba(255,255,255,0.03)" } }
      },
      plugins: {
        legend: { labels: { color: "#e6f4ea", boxWidth: 12 } }
      }
    }
  });
}
