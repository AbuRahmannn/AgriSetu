// ==========================================================================
// AgriSetu Market Advisory Page Controller (Geospatial & Price Trends)
// ==========================================================================

import { API_BASE } from "./config.js";

let map = null;
let marketChartInstance = null;
let userMarker = null;
let routePolyline = null;

// User coordinates fallback (center of Punjab/Amritsar region for SIH context)
let userLat = 31.6340;
let userLon = 74.8723;
let buyersData = { buyers: [], listings: [] };

document.addEventListener("DOMContentLoaded", () => {
  initMarketMap();
  initMarketSuggestions("Rice");
  initListingForm();
});

// Refocus map function exposed globally to repair Leaflet display issues in tabs
window.refocusMap = function() {
  if (map) {
    map.invalidateSize();
    map.setView([userLat, userLon], 9);
  }
};

function initMarketMap() {
  // Initialize Leaflet Map
  map = L.map("map").setView([userLat, userLon], 9);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // Mark User Location
  userMarker = L.marker([userLat, userLon], {
    icon: L.divIcon({
      className: 'user-marker-icon',
      html: `<div style="background: var(--accent); border: 3px solid white; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [16, 16]
    })
  }).addTo(map).bindPopup("📍 Your Farm Location").openPopup();

  // Try retrieving user's HTML5 geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLat = position.coords.latitude;
        userLon = position.coords.longitude;
        map.setView([userLat, userLon], 10);
        userMarker.setLatLng([userLat, userLon]).bindPopup("📍 Verified Farm Location").openPopup();
        loadMapEntities();
      },
      () => {
        loadMapEntities(); // Fallback to defaults
      }
    );
  } else {
    loadMapEntities();
  }

  // Setup search filter
  const searchInput = document.getElementById("cropSearch");
  searchInput.addEventListener("input", () => {
    const text = searchInput.value.trim().toLowerCase();
    
    // Filter listings in UI
    renderBuyersList(text);
    
    // Pull price history charts for the filtered crop if it matches valid crop
    const match = ["rice", "wheat", "maize", "cotton", "sugarcane"].find(c => text.includes(c));
    if (match) {
      const cap = match.charAt(0).toUpperCase() + match.slice(1);
      initMarketSuggestions(cap);
    }
  });
}

async function loadMapEntities() {
  try {
    const res = await fetch(API_BASE + "/api/market/buyers");
    if (!res.ok) throw new Error("Could not load buyers from server");
    buyersData = await res.json();
    
    renderBuyersList("");
    renderMarkersOnMap();
  } catch (error) {
    console.error("Error loading map assets:", error);
  }
}

function renderBuyersList(filterText = "") {
  const container = document.getElementById("buyers-list");
  container.innerHTML = "";
  
  // 1. Filter commercial buyers
  const filteredBuyers = (buyersData.buyers || []).filter(b => 
    b.produce.toLowerCase().includes(filterText) || 
    b.name.toLowerCase().includes(filterText)
  );

  // 2. Filter user/farmer sale offers
  const filteredListings = (buyersData.listings || []).filter(l => 
    l.crop.toLowerCase().includes(filterText) || 
    l.seller.toLowerCase().includes(filterText)
  );

  if (filteredBuyers.length === 0 && filteredListings.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 2rem 0;">No offers found matching your criteria.</div>`;
    return;
  }

  // Render listings (Sellers) first
  filteredListings.forEach(listing => {
    const dist = calculateDistance(userLat, userLon, listing.lat, listing.lon);
    const card = document.createElement("div");
    card.style.background = "rgba(251, 191, 36, 0.03)";
    card.style.border = "1px solid rgba(251, 191, 36, 0.2)";
    card.style.padding = "1rem";
    card.style.borderRadius = "0.75rem";
    card.style.marginBottom = "0.75rem";
    card.style.cursor = "pointer";
    card.style.position = "relative";
    
    card.innerHTML = `
      <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(251,191,36,0.15); border: 1px solid var(--accent); padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.65rem; color: var(--accent); font-weight: 700;">🌾 SELLER OFFER</div>
      <div style="margin-bottom: 0.25rem;">
        <h4 style="font-weight: 700; font-size: 0.95rem; padding-right: 5rem;">${listing.seller}</h4>
        <div style="color: var(--accent); font-weight: 800; font-size: 0.9rem; margin-top: 0.25rem;">Selling Price: ₹${listing.price}/Qtl</div>
      </div>
      <div style="font-size: 0.8rem; color: var(--color-text-muted); display: flex; justify-content: space-between;">
        <span>🌾 Crop: ${listing.crop} (${listing.quantity} Qtl)</span>
        <span>📍 ${dist.toFixed(1)} km away</span>
      </div>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
        <button class="btn-accent simulate-route-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 0.5rem; flex: 1; color:#000;">🗺️ Trace Route</button>
        <a href="tel:${listing.phone}" class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 0.5rem; text-decoration: none; text-align: center; flex: 1;">📞 Call Farmer</a>
      </div>
    `;
    
    card.querySelector(".simulate-route-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      simulateRouteTrace(listing);
    });

    card.addEventListener("click", () => {
      map.setView([listing.lat, listing.lon], 12);
      L.popup().setLatLng([listing.lat, listing.lon])
        .setContent(`<strong>🌾 Farmer Sale Listing</strong><br>Seller: ${listing.seller}<br>Crop: ${listing.crop}<br>Price: ₹${listing.price}/Qtl`)
        .openOn(map);
    });

    container.appendChild(card);
  });

  // Render commercial buyers
  filteredBuyers.forEach(buyer => {
    const dist = calculateDistance(userLat, userLon, buyer.lat, buyer.lon);
    const card = document.createElement("div");
    card.style.background = "rgba(255, 255, 255, 0.03)";
    card.style.border = "1px solid var(--border-glass)";
    card.style.padding = "1rem";
    card.style.borderRadius = "0.75rem";
    card.style.marginBottom = "0.75rem";
    card.style.cursor = "pointer";
    card.style.position = "relative";
    
    card.innerHTML = `
      <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(16,185,129,0.15); border: 1px solid var(--primary); padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.65rem; color: var(--primary); font-weight: 700;">🏢 BUYER BID</div>
      <div style="margin-bottom: 0.25rem;">
        <h4 style="font-weight: 700; font-size: 0.95rem; padding-right: 5rem;">${buyer.name} ${buyer.verified ? '<span style="color: var(--primary); font-size: 0.8rem;">[Verified]</span>' : ''}</h4>
        <div style="color: var(--primary); font-weight: 800; font-size: 0.9rem; margin-top: 0.25rem;">Buying Price: ₹${buyer.price}/Qtl</div>
      </div>
      <div style="font-size: 0.8rem; color: var(--color-text-muted); display: flex; justify-content: space-between;">
        <span>🌾 Crop: ${buyer.produce}</span>
        <span>📍 ${dist.toFixed(1)} km away</span>
      </div>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
        <button class="btn-primary simulate-route-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 0.5rem; flex: 1;">🗺️ Trace Route</button>
        <a href="tel:${buyer.phone}" class="btn-accent" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 0.5rem; color: #000; text-decoration: none; text-align: center; flex: 1;">📞 Call Buyer</a>
      </div>
    `;
    
    card.querySelector(".simulate-route-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      simulateRouteTrace(buyer);
    });

    card.addEventListener("click", () => {
      map.setView([buyer.lat, buyer.lon], 12);
      L.popup().setLatLng([buyer.lat, buyer.lon])
        .setContent(`<strong>🏢 Commercial Buyer</strong><br>Buyer: ${buyer.name}<br>Crop: ${buyer.produce}<br>Price: ₹${buyer.price}/Qtl`)
        .openOn(map);
    });

    container.appendChild(card);
  });
}

function renderMarkersOnMap() {
  // Clear previous markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker && layer !== userMarker) {
      map.removeLayer(layer);
    }
  });

  // Render commercial buyers
  (buyersData.buyers || []).forEach(buyer => {
    const dist = calculateDistance(userLat, userLon, buyer.lat, buyer.lon);
    const buyerIcon = L.divIcon({
      className: 'buyer-marker-icon',
      html: `<div style="background: var(--primary); border: 2.5px solid white; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 8px var(--primary);"></div>`,
      iconSize: [14, 14]
    });

    L.marker([buyer.lat, buyer.lon], { icon: buyerIcon }).addTo(map)
      .bindPopup(`
        <strong>🏢 Commercial Buyer</strong><br>
        <strong>${buyer.name}</strong><br>
        🌾 Crop: ${buyer.produce}<br>
        💰 Buying Price: ₹${buyer.price}/Qtl<br>
        📍 Distance: ${dist.toFixed(1)} km
      `);
  });

  // Render farmer sales listings
  (buyersData.listings || []).forEach(listing => {
    const dist = calculateDistance(userLat, userLon, listing.lat, listing.lon);
    const listingIcon = L.divIcon({
      className: 'listing-marker-icon',
      html: `<div style="background: var(--accent); border: 2.5px solid white; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 8px var(--accent);"></div>`,
      iconSize: [14, 14]
    });

    L.marker([listing.lat, listing.lon], { icon: listingIcon }).addTo(map)
      .bindPopup(`
        <strong>🌾 Farmer Sale Listing</strong><br>
        <strong>${listing.seller}</strong><br>
        🌾 Crop: ${listing.crop}<br>
        📦 Quantity: ${listing.quantity} Qtl<br>
        💰 Price Asked: ₹${listing.price}/Qtl<br>
        📍 Distance: ${dist.toFixed(1)} km
      `);
  });
}

// Haversine distance calculator
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Visual Polyline Tracing Simulator
function simulateRouteTrace(destination) {
  if (routePolyline) {
    map.removeLayer(routePolyline);
  }
  
  // Fit map boundaries to include both locations
  const destLat = destination.lat;
  const destLon = destination.lon;
  const bounds = L.latLngBounds([userLat, userLon], [destLat, destLon]);
  map.fitBounds(bounds, { padding: [50, 50] });

  // Simulate a realistic driving route by adding coordinates with noise
  const steps = 8;
  const routeCoords = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    let lat = userLat + (destLat - userLat) * ratio;
    let lon = userLon + (destLon - userLon) * ratio;
    
    if (i > 0 && i < steps) {
      lat += (Math.random() - 0.5) * 0.02;
      lon += (Math.random() - 0.5) * 0.02;
    }
    routeCoords.push([lat, lon]);
  }

  // Draw polyline
  routePolyline = L.polyline(routeCoords, {
    color: 'var(--accent)',
    weight: 4,
    opacity: 0.85,
    dashArray: '8, 8',
    lineJoin: 'round'
  }).addTo(map);

  // Animated pulse effect
  let dashOffset = 0;
  const interval = setInterval(() => {
    if (!routePolyline || !map.hasLayer(routePolyline)) {
      clearInterval(interval);
      return;
    }
    dashOffset = (dashOffset - 1) % 16;
    routePolyline.setStyle({ dashOffset: dashOffset.toString() });
  }, 100);

  // Autofill Crop search with crop automatically
  const crop = destination.produce || destination.crop;
  document.getElementById("cropSearch").value = crop;
  initMarketSuggestions(crop);
}

// 5. Monthly Market price suggestions charts
async function initMarketSuggestions(cropName) {
  try {
    const res = await fetch(API_BASE + `/api/market/suggestions?crop=${cropName}`);
    if (!res.ok) throw new Error("Could not fetch pricing data");
    const data = await res.json();

    const months = data.price_history.map(item => item.month);
    const prices = data.price_history.map(item => item.price);
    
    document.getElementById("marketAdvisoryText").innerText = data.recommendation;

    const ctx = document.getElementById("marketChart").getContext("2d");
    if (marketChartInstance) {
      marketChartInstance.destroy();
    }

    marketChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [{
          label: `${cropName} Mandi Price Trend (₹/Qtl)`,
          borderColor: "#10b981",
          borderWidth: 2.5,
          tension: 0.4,
          data: prices,
          fill: false,
          pointBackgroundColor: "#fbbf24",
          pointRadius: 4
        }]
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

  } catch (error) {
    console.error("Market suggestions error:", error);
  }
}

// Custom Sale Listing Form Submission
function initListingForm() {
  const submitBtn = document.getElementById("submitSaleBtn");
  if (!submitBtn) return;

  // Prefill phone from profile if saved
  const profileStr = localStorage.getItem("agrisetu_profile");
  if (profileStr) {
    const profile = JSON.parse(profileStr);
    if (profile.phone) {
      document.getElementById("salePhone").value = profile.phone;
    }
  }

  submitBtn.addEventListener("click", async () => {
    const crop = document.getElementById("saleCrop").value;
    const qty = parseFloat(document.getElementById("saleQty").value);
    const price = parseFloat(document.getElementById("salePrice").value);
    const phone = document.getElementById("salePhone").value.trim();

    if (isNaN(qty) || isNaN(price) || !phone) {
      alert("Please fill out all sale offer details!");
      return;
    }

    let seller = "Farmer";
    let locationName = "Punjab";
    
    const p = localStorage.getItem("agrisetu_profile");
    if (p) {
      const obj = JSON.parse(p);
      seller = obj.name || "Farmer";
      locationName = obj.village || "Punjab";
    }

    submitBtn.innerText = "Publishing Offer...";
    submitBtn.disabled = true;

    // Add tiny random offset to farm coordinates so markers sit close but distinct
    const offsetLat = (Math.random() - 0.5) * 0.05;
    const offsetLon = (Math.random() - 0.5) * 0.05;

    const payload = {
      seller: seller,
      crop: crop,
      quantity: qty,
      price: price,
      phone: phone,
      location: locationName,
      lat: userLat + offsetLat,
      lon: userLon + offsetLon
    };

    try {
      const res = await fetch(API_BASE + "/api/market/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Could not submit crop listing");
      
      alert("Crop listing published successfully! It will now appear on the market list and map.");
      
      // Close collapsible details panel
      const details = submitBtn.closest("details");
      if (details) details.removeAttribute("open");

      // Reset values
      document.getElementById("saleQty").value = "30";
      document.getElementById("salePrice").value = "2300";

      // Reload markers and lists
      loadMapEntities();

    } catch (error) {
      console.error("Listing publish failed:", error);
      alert(`Publishing Failed: ${error.message}`);
    } finally {
      submitBtn.innerText = "Publish Sale Offer";
      submitBtn.disabled = false;
    }
  });
}