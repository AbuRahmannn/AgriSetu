import { API_BASE } from "./config.js";

export let currentLanguage = "en";
export let profileName = "Farmer";
export let profileVillage = "Amritsar, Punjab";

let telemetryChart = null;
let iotInterval = null;
let isSimulating = false;

const HASH_MAP = {
  "#home": "tab-home",
  "#crop": "tab-crop",
  "#disease": "tab-disease",
  "#chatbot": "tab-chatbot",
  "#market": "tab-market",
  "#traceability": "tab-trace",
  "#weather": "tab-weather",
  "#community": "tab-forum"
};

document.addEventListener("DOMContentLoaded", () => {
  initTabRouting();
  initProfile();
  initTelemetryChart();
  initLanguageSelector();
  initBlockchain();
  initWeather();
});

// 1. SPA Tab Routing with hash navigation
function initTabRouting() {
  window.addEventListener("hashchange", handleHashRouting);
  handleHashRouting();
}

function handleHashRouting() {
  const hash = window.location.hash || "#home";
  const targetTabId = HASH_MAP[hash] || "tab-home";

  // Update active state in sidebar menu
  const navItems = document.querySelectorAll(".nav-menu .nav-item");
  navItems.forEach(nav => {
    if (nav.getAttribute("data-tab") === targetTabId) {
      nav.classList.add("active");
    } else {
      nav.classList.remove("active");
    }
  });

  // Toggle active tab content pane
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach(tab => {
    if (tab.getAttribute("id") === targetTabId) {
      tab.classList.add("active-tab");
      
      // Trigger staggered entrance animations for all glass cards within active tab
      const cards = tab.querySelectorAll(".glass-card");
      cards.forEach((card, idx) => {
        card.classList.remove("stagger-in");
        void card.offsetWidth; // Force element reflow
        card.classList.add("stagger-in");
      });
    } else {
      tab.classList.remove("active-tab");
    }
  });

  // Update dashboard header title dynamically based on active tab
  const activeNav = document.querySelector(`.nav-menu .nav-item[data-tab="${targetTabId}"]`);
  if (activeNav) {
    const tabTitle = activeNav.textContent.trim().replace(/[^\w\s]/g, '').trim();
    document.getElementById("dashboardTitle").innerText = tabTitle;
  }

  // Force map to recalculate size when switching to market tab
  if (targetTabId === "tab-market" && window.refocusMap) {
    setTimeout(() => window.refocusMap(), 150);
  }
}

// 2. Profile Management
function initProfile() {
  const saveBtn = document.getElementById("saveProfile");
  const nameInput = document.getElementById("farmerName");
  const villageInput = document.getElementById("farmerVillage");
  const phoneInput = document.getElementById("farmerPhone");
  const statusBadge = document.getElementById("profileStatus");

  const loadLocalProfile = () => {
    const p = localStorage.getItem("agrisetu_profile");
    if (p) {
      const obj = JSON.parse(p);
      profileName = obj.name || "Farmer";
      profileVillage = obj.village || "Amritsar, Punjab";
      nameInput.value = profileName;
      villageInput.value = profileVillage;
      phoneInput.value = obj.phone || "";
      statusBadge.innerText = `Farmer Profile: ${profileName} (${profileVillage})`;
    } else {
      statusBadge.innerText = "Farmer Profile: Not Set (Guest)";
    }
  };

  saveBtn.addEventListener("click", () => {
    const name = nameInput.value.trim() || "Farmer";
    const village = villageInput.value.trim() || "Amritsar, Punjab";
    const phone = phoneInput.value.trim();
    
    profileName = name;
    profileVillage = village;

    const profile = { name, village, phone };
    localStorage.setItem("agrisetu_profile", JSON.stringify(profile));
    statusBadge.innerText = `Farmer Profile: ${name} (${village})`;
    
    // Autofill Blockchain minting parameters if they are on that tab
    const traceFarmer = document.getElementById("traceFarmerName");
    const traceLocation = document.getElementById("traceLocation");
    const forumAuthor = document.getElementById("postAuthor");
    if (traceFarmer) traceFarmer.value = name;
    if (traceLocation) traceLocation.value = village;
    if (forumAuthor) forumAuthor.value = name;

    alert("Profile saved successfully and synced with AgriSetu nodes!");
  });

  loadLocalProfile();
}

// 3. Language Selector translation strings
function initLanguageSelector() {
  const langSelect = document.getElementById("languageSelect");
  langSelect.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    // Broadcast language change to chatbot
    const event = new CustomEvent("langChange", { detail: currentLanguage });
    window.dispatchEvent(event);
  });
}

// 4. IoT Sensor Telemetry & Chart.js Visualizer
function initTelemetryChart() {
  const ctx = document.getElementById("telemetryChart").getContext("2d");
  
  telemetryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Soil Moisture (%)",
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          data: [],
          borderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: "Temperature (°C)",
          borderColor: "#fbbf24",
          backgroundColor: "rgba(251, 191, 36, 0.05)",
          data: [],
          borderWidth: 2,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#9bbfa8" }
        },
        y: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#9bbfa8" }
        }
      },
      plugins: {
        legend: { labels: { color: "#e6f4ea" } }
      }
    }
  });

  // Pull baseline telemetry history from FastAPI
  fetchTelemetryData();

  // Setup simulation controls
  const toggleBtn = document.getElementById("toggleIoTSim");
  toggleBtn.addEventListener("click", () => {
    const dot = document.querySelector(".status-dot");
    const telemetryCards = document.querySelectorAll(".telemetry-card");
    if (isSimulating) {
      // Turn off
      clearInterval(iotInterval);
      isSimulating = false;
      toggleBtn.innerText = "Simulate Sensor";
      toggleBtn.classList.remove("btn-primary");
      toggleBtn.classList.add("btn-accent");
      dot.classList.remove("active");
      
      // Stop pulsing visual glow on telemetry gauge cards
      telemetryCards.forEach(c => c.classList.remove("live-pulse"));
    } else {
      // Turn on
      isSimulating = true;
      toggleBtn.innerText = "Stop Telemetry";
      toggleBtn.classList.remove("btn-accent");
      toggleBtn.classList.add("btn-primary");
      dot.classList.add("active");
      
      // Apply pulsing visual glow on telemetry gauge cards
      telemetryCards.forEach(c => c.classList.add("live-pulse"));
      
      iotInterval = setInterval(simulateSensorLog, 2000);
    }
  });
}

async function fetchTelemetryData() {
  try {
    const res = await fetch(API_BASE + "/api/iot/telemetry");
    if (!res.ok) throw new Error("Could not fetch telemetry history");
    const data = await res.json();
    
    // Populate charts
    const labels = data.history.map(item => item.time);
    const moistures = data.history.map(item => item.moisture);
    const temps = data.history.map(item => item.temp);
    
    telemetryChart.data.labels = labels;
    telemetryChart.data.datasets[0].data = moistures;
    telemetryChart.data.datasets[1].data = temps;
    telemetryChart.update();
    
    // Update dashboard gauges with the latest reading
    const last = data.history[data.history.length - 1];
    if (last) {
      updateTelemetryGauges(last);
    }
  } catch (error) {
    console.error("Error loading IoT telemetry:", error);
  }
}

function updateTelemetryGauges(reading) {
  document.getElementById("iotMoisture").innerText = `${reading.moisture}%`;
  document.getElementById("iotTemp").innerText = `${reading.temp}°C`;
  document.getElementById("iotPH").innerText = `${reading.ph}`;
  document.getElementById("iotN").innerText = `${reading.N}`;
  document.getElementById("iotP").innerText = `${reading.P}`;
  document.getElementById("iotK").innerText = `${reading.K}`;
}

async function simulateSensorLog() {
  // Generate slightly fluctuating readings
  const moisture = Math.round((60 + Math.random() * 15) * 10) / 10;
  const temp = Math.round((24 + Math.random() * 8) * 10) / 10;
  const ph = Math.round((6.0 + Math.random() * 0.8) * 100) / 100;
  const n = Math.round(75 + Math.random() * 15);
  const p = Math.round(40 + Math.random() * 10);
  const k = Math.round(35 + Math.random() * 12);
  
  const reading = { moisture, temp, ph, N: n, P: p, K: k };
  updateTelemetryGauges(reading);
  
  // Add to Chart
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  telemetryChart.data.labels.push(timeStr);
  telemetryChart.data.datasets[0].data.push(moisture);
  telemetryChart.data.datasets[1].data.push(temp);
  
  // Shift out oldest values
  if (telemetryChart.data.labels.length > 10) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }
  telemetryChart.update();
  
  // Post data to backend API to simulate live transmission log
  try {
    await fetch(API_BASE + "/api/iot/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reading)
    });
  } catch (error) {
    console.error("Telemetry ingest upload failed:", error);
  }
}

// 5. Blockchain Supply Chain Traceability Visualizer
function initBlockchain() {
  const mintBtn = document.getElementById("mintBtn");
  const modal = document.getElementById("certificateModal");
  const closeModalBtn = document.getElementById("closeCertModal");

  // Autofill from user profile if already loaded
  document.getElementById("traceFarmerName").value = profileName;
  document.getElementById("traceLocation").value = profileVillage;

  // Load existing blockchain ledger logs
  fetchBlockchainLedger();

  // Mint new block
  mintBtn.addEventListener("click", async () => {
    const farmer = document.getElementById("traceFarmerName").value.trim();
    const crop = document.getElementById("traceCrop").value;
    const qty = parseFloat(document.getElementById("traceQty").value);
    const loc = document.getElementById("traceLocation").value.trim();
    const organic = document.getElementById("traceOrganic").checked;

    if (!farmer || !loc || isNaN(qty)) {
      alert("Please fill out all traceability registration fields!");
      return;
    }

    mintBtn.innerText = "⛏️ Mining Cryptographic Block...";
    mintBtn.disabled = true;

    const payload = {
      farmer: farmer,
      crop: crop,
      quantity: qty,
      location: loc,
      organic: organic
    };

    try {
      const res = await fetch(API_BASE + "/api/blockchain/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Verification minting failed");
      const result = await res.json();
      
      if (result.status === "success") {
        // Visual block mining completion message, then open certificate modal
        alert(`⛏️ Block Mined Successfully!\nNonce: ${result.block.nonce}\nHash: ${result.block.txHash.slice(0, 16)}...`);
        showCertificate(result.block);
        fetchBlockchainLedger(); // Refresh explorer pane
      }

    } catch (error) {
      console.error("Blockchain mint failed:", error);
      alert(`Blockchain Minting Failed: ${error.message}. Check FastAPI service.`);
    } finally {
      mintBtn.innerText = "🔒 Mint Cryptographic Block";
      mintBtn.disabled = false;
    }
  });

  closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}

async function fetchBlockchainLedger() {
  const lane = document.getElementById("blockchainLane");
  if (!lane) return;

  try {
    const res = await fetch(API_BASE + "/api/blockchain/ledger");
    if (!res.ok) throw new Error("Could not fetch ledger feed");
    const data = await res.json();

    lane.innerHTML = "";
    data.ledger.reverse().forEach((block, idx) => {
      const node = document.createElement("div");
      node.className = "block-node elastic-node";
      
      const time = new Date(block.timestamp).toLocaleString();
      const orgTag = block.organic ? '<span style="color: var(--primary); font-weight:700;">[Organic]</span>' : '';
      
      node.innerHTML = `
        <div class="block-header">
          <span>Block #${block.index}</span>
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">${time}</span>
        </div>
        <div style="font-size: 0.85rem; margin-bottom: 0.25rem;">
          🌾 <strong>${block.farmer}</strong> harvested <strong>${block.quantity} Qtl</strong> of <strong>${block.crop}</strong> in <strong>${block.location}</strong>. ${orgTag}
        </div>
        <div class="block-hash">TX: ${block.txHash}</div>
        <div style="font-size:0.7rem; color: var(--color-text-muted); margin-top:0.25rem;">Prev Hash: ${block.prevHash.slice(0, 32)}...</div>
      `;
      lane.appendChild(node);
    });

  } catch (error) {
    console.error("Error loading blockchain ledger:", error);
  }
}

function showCertificate(block) {
  const modal = document.getElementById("certificateModal");
  document.getElementById("certFarmer").innerText = block.farmer;
  document.getElementById("certCrop").innerText = block.crop;
  document.getElementById("certQty").innerText = block.quantity;
  document.getElementById("certLoc").innerText = block.location;
  document.getElementById("certOrganic").innerText = block.organic ? "Yes (Verified On-Chain)" : "No";
  
  const time = new Date(block.timestamp).toLocaleString();
  document.getElementById("certTime").innerText = time;
  document.getElementById("certHash").innerText = block.txHash;
  
  // Set QR code contents using QRServer API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=AgriSetu-Farmer:${encodeURIComponent(block.farmer)}-Crop:${block.crop}-Qty:${block.quantity}-Hash:${block.txHash}`;
  document.getElementById("certQR").src = qrUrl;

  modal.classList.remove("hidden");
}

// 6. Real-Time Geolocation & Agricultural Weather Widget
function initWeather() {
  const refreshBtn = document.getElementById("refreshWeatherBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => fetchWeatherAndAdvisory());
  }
  
  // Fetch weather automatically on page display load
  fetchWeatherAndAdvisory();
}

async function fetchWeatherAndAdvisory() {
  const locationNameEl = document.getElementById("weatherLocationName");
  const tempEl = document.getElementById("weatherTemp");
  const conditionEl = document.getElementById("weatherCondition");
  const humidityEl = document.getElementById("weatherHumidity");
  const windEl = document.getElementById("weatherWind");
  const rainEl = document.getElementById("weatherRain");
  const feelsEl = document.getElementById("weatherFeelsLike");
  const visualBox = document.getElementById("weatherVisualBox");
  const advisoryEl = document.getElementById("weatherAdvisory");

  if (!locationNameEl) return;

  locationNameEl.innerText = "Locating field...";
  tempEl.innerText = "--°C";
  conditionEl.innerText = "Connecting...";

  // Setup geolocation coordinates
  let lat = 31.6340; // Default: Punjab
  let lon = 74.8723;
  let cityName = "Punjab";

  const getIPLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) throw new Error("IP geolocation failed");
      const ipData = await res.json();
      if (ipData.latitude && ipData.longitude) {
        lat = ipData.latitude;
        lon = ipData.longitude;
        cityName = `🌐 IP Network: ${ipData.city || ""}, ${ipData.region || "Punjab"} (Live Location)`;
      }
    } catch (e) {
      console.warn("Could not retrieve IP geolocation:", e);
      cityName = "Punjab (Network offline)";
    }
  };

  // Try browser location services first
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        cityName = `📡 GPS: (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E) (Live Location)`;
        await runWeatherFetch();
      },
      async (err) => {
        console.warn("Browser location access denied/failed, falling back to IP:", err.message);
        await getIPLocation();
        await runWeatherFetch();
      },
      { timeout: 6000 }
    );
  } else {
    await getIPLocation();
    await runWeatherFetch();
  }

  async function runWeatherFetch() {
    locationNameEl.innerText = cityName;
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m`;
      const res = await fetch(weatherUrl);
      if (!res.ok) throw new Error("Could not download Open-Meteo telemetry");
      const wData = await res.json();
      
      const current = wData.current;
      if (!current) throw new Error("Open-Meteo current payload missing");

      // Update basic fields
      const tempVal = current.temperature_2m;
      tempEl.innerText = `${tempVal.toFixed(1)}°C`;
      humidityEl.innerText = `${current.relative_humidity_2m}%`;
      windEl.innerText = `${current.wind_speed_10m} km/h`;
      
      const totalRainVal = (current.rain || 0) + (current.showers || 0);
      rainEl.innerText = `${totalRainVal.toFixed(1)} mm`;
      feelsEl.innerText = `${current.apparent_temperature.toFixed(1)}°C`;

      // Decode WMO weather code
      const code = current.weather_code;
      const weatherConditionMapping = {
        0: { text: "Clear Sky", art: "sun" },
        1: { text: "Mainly Clear", art: "sun" },
        2: { text: "Partly Cloudy", art: "cloud" },
        3: { text: "Overcast Cloudy", art: "cloud" },
        45: { text: "Foggy Mist", art: "cloud" },
        48: { text: "Depositing Rime Fog", art: "cloud" },
        51: { text: "Light Drizzle", art: "rain" },
        53: { text: "Moderate Drizzle", art: "rain" },
        55: { text: "Dense Drizzle", art: "rain" },
        61: { text: "Slight Rain", art: "rain" },
        63: { text: "Moderate Rain", art: "rain" },
        65: { text: "Heavy Rain", art: "rain" },
        71: { text: "Slight Snowfall", art: "snow" },
        73: { text: "Moderate Snowfall", art: "snow" },
        75: { text: "Heavy Snowfall", art: "snow" },
        80: { text: "Slight Showers", art: "rain" },
        81: { text: "Moderate Showers", art: "rain" },
        82: { text: "Violent Showers", art: "rain" },
        95: { text: "Thunderstorm", art: "lightning" },
        96: { text: "Thunderstorm with Slight Hail", art: "lightning" },
        99: { text: "Thunderstorm with Heavy Hail", art: "lightning" }
      };

      const matchedCond = weatherConditionMapping[code] || { text: "Calm Conditions", art: "sun" };
      conditionEl.innerText = matchedCond.text;

      // Render Dynamic Animations inside weatherVisualBox
      visualBox.innerHTML = "";
      if (matchedCond.art === "sun") {
        visualBox.innerHTML = '<div class="weather-art-sun"></div>';
      } else if (matchedCond.art === "cloud") {
        visualBox.innerHTML = '<div class="weather-art-cloud"></div>';
      } else if (matchedCond.art === "rain") {
        drawRainParticles(visualBox);
      } else if (matchedCond.art === "snow") {
        drawSnowParticles(visualBox);
      } else if (matchedCond.art === "lightning") {
        // Draw lightning + rain drops together
        visualBox.innerHTML = '<div class="weather-art-lightning" style="position: absolute; z-index: 15;"></div>';
        drawRainParticles(visualBox);
      }

      // Generate Agricultural Advisory Alert messages based on meteorological levels
      let advisoryText = "🌱 Optimal weather conditions detected. Perfect window for sowing, nitrogen dressing, or pest sprays.";
      
      if (totalRainVal > 1.5) {
        advisoryText = "☔ Warning: Active precipitation detected. Postpone nitrogen fertilizer application to prevent runoff. Ensure farm drainage is clear.";
      } else if (current.wind_speed_10m > 18.0) {
        advisoryText = "💨 Warning: Wind speed exceeds 18 km/h. Postpone organic/chemical sprays to avoid chemical drift. Support tall crop varieties.";
      } else if (tempVal > 35.0) {
        advisoryText = "⚠️ Warning: Extreme temperature alert. Increase soil irrigation schedule to avoid evaporation stress. Check moisture sensors.";
      } else if (tempVal < 10.0) {
        advisoryText = "❄️ Caution: Frost warnings. Protect germinating sprouts by covering nursery channels or applying light irrigation.";
      }
      
      advisoryEl.innerText = advisoryText;

    } catch (error) {
      console.error("Weather service sync failure:", error);
      conditionEl.innerText = "Offline Forecast";
      advisoryEl.innerText = "Advisory service offline. Check internet connection to synchronize sensors.";
    }
  }
}

// Particle rendering loops
function drawRainParticles(container) {
  const rainContainer = document.createElement("div");
  rainContainer.className = "weather-art-rain";
  rainContainer.style.width = "100%";
  rainContainer.style.height = "100%";
  rainContainer.style.position = "relative";
  rainContainer.style.overflow = "hidden";
  
  const count = 25;
  for (let i = 0; i < count; i++) {
    const drop = document.createElement("div");
    drop.className = "rain-drop";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * 1.5}s`;
    drop.style.animationDuration = `${0.5 + Math.random() * 0.6}s`;
    rainContainer.appendChild(drop);
  }
  container.appendChild(rainContainer);
}

function drawSnowParticles(container) {
  const snowContainer = document.createElement("div");
  snowContainer.className = "weather-art-snow";
  snowContainer.style.width = "100%";
  snowContainer.style.height = "100%";
  snowContainer.style.position = "relative";
  snowContainer.style.overflow = "hidden";
  
  const count = 18;
  for (let i = 0; i < count; i++) {
    const flake = document.createElement("div");
    flake.className = "snow-flake";
    const size = 3 + Math.random() * 5;
    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.animationDelay = `${Math.random() * 2}s`;
    flake.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
    snowContainer.appendChild(flake);
  }
  container.appendChild(snowContainer);
}
