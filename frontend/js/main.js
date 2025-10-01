document.getElementById('saveProfile').addEventListener('click', function(){
  const name = document.getElementById('farmerName').value;
  const village = document.getElementById('farmerVillage').value;
  const phone = document.getElementById('farmerPhone').value;
  const profile = {name, village, phone};
  localStorage.setItem('agrisetu_profile', JSON.stringify(profile));
  document.getElementById('profileStatus').innerText = 'Profile saved locally (offline-capable)';
});
window.addEventListener('load', ()=>{
  const p = localStorage.getItem('agrisetu_profile');
  if(p){ const obj = JSON.parse(p); document.getElementById('profileStatus').innerText = 'Welcome ' + (obj.name||'Farmer'); }
});
