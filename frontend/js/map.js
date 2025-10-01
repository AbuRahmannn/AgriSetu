const map = L.map('map').setView([20.5937,78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(map);
// Demo buyers (in production, fetch nearby buyers from backend using geolocation)
const buyers = [
  {name:'Buyer A', lat:17.3850, lon:78.4867, produce:'Rice', price:22000},
  {name:'Buyer B', lat:13.0827, lon:80.2707, produce:'Maize', price:15000},
  {name:'Buyer C', lat:19.0760, lon:72.8777, produce:'Wheat', price:18000},
];
buyers.forEach(b=>{
  L.marker([b.lat,b.lon]).addTo(map).bindPopup(`<b>${b.name}</b><br>${b.produce} - ₹${b.price/100} per kg approx`);
});
// Try to center to user's location
map.locate({setView:true, maxZoom:12});
