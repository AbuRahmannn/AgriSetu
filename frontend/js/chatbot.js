const log = (who, txt)=>{
  const el = document.createElement('div'); el.innerHTML = `<strong>${who}:</strong> ${txt}`; document.getElementById('chatLog').appendChild(el);
  if(who==='Bot') window.speechSynthesis.speak(new SpeechSynthesisUtterance(txt));
}
document.getElementById('sendChat').addEventListener('click', async ()=>{
  const t = document.getElementById('chatInput').value;
  if(!t) return;
  log('You', t);
  const res = await fetch('http://localhost:8000/api/chatbot', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text:t, lang:'en'})});
  const json = await res.json();
  log('Bot', json.reply || JSON.stringify(json));
});
// Basic browser speech recognition (Web Speech API)
document.getElementById('speakBtn').addEventListener('click', ()=>{
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){ alert('Speech Recognition not supported in this browser.'); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR(); r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = (e)=>{ const t = e.results[0][0].transcript; document.getElementById('chatInput').value = t; document.getElementById('sendChat').click(); }
  r.start();
});
