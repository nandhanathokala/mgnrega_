
let personChart, expChart, compareChart;

async function fetchJSON(url){
  try{
    const r = await fetch(url);
    return await r.json();
  }catch(e){
    alert('Network error');
    return null;
  }
}

function speak(text){
  if(!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

document.getElementById('voiceBtn').addEventListener('click', ()=>{
  speak('Voice assistant is active. Select a district and click Show Data.');
});

document.getElementById('showBtn').addEventListener('click', async ()=>{
  const d = document.getElementById('districtSelect').value;
  if(!d) { alert('Select district'); return; }
  await loadDistrict(d);
  // auto-read summary
  const cards = document.querySelectorAll('#cards .card-small h5');
  if(cards.length){
    const summary = `In ${d}, total person days ${cards[0].textContent}, expenditure ${cards[1].textContent} crores, active workers ${cards[3].textContent}`;
    speak(summary);
  }
});

document.getElementById('compareBtn').addEventListener('click', compareAll);
document.getElementById('reportBtn').addEventListener('click', ()=>{
  const d = document.getElementById('districtSelect').value;
  if(!d){ alert('Select district'); return; }
  window.open('/api/report?district=' + encodeURIComponent(d), '_blank');
});

document.getElementById('downloadPerson').addEventListener('click', ()=>{
  const url = document.getElementById('persondaysChart').toDataURL();
  const a = document.createElement('a'); a.href = url; a.download = 'persondays.png'; a.click();
});
document.getElementById('downloadExp').addEventListener('click', ()=>{
  const url = document.getElementById('expenditureChart').toDataURL();
  const a = document.createElement('a'); a.href = url; a.download = 'expenditure.png'; a.click();
});

async function loadDistrict(district){
  const data = await fetchJSON('/api/data?district=' + encodeURIComponent(district));
  if(!data || data.error) { alert(data ? data.error : 'No data'); return; }
  // cards
  const cards = document.getElementById('cards');
  cards.innerHTML = `
    <div class="col-md-3"><div class="card-small"><h6>Total Persondays</h6><h5>${Number(data.persondays).toLocaleString()}</h5></div></div>
    <div class="col-md-3"><div class="card-small"><h6>Total Expenditure (₹ Cr)</h6><h5>${data.expenditure}</h5></div></div>
    <div class="col-md-3"><div class="card-small"><h6>Projects Completed</h6><h5>${data.projects_completed}</h5></div></div>
    <div class="col-md-3"><div class="card-small"><h6>Active Workers</h6><h5>${data.active_workers}</h5></div></div>
  `;
  const labels = data.monthly.map(m=> m.month + ' ' + m.year);
  const pd = data.monthly.map(m=> m.persondays);
  const exp = data.monthly.map(m=> m.expenditure);
  // destroy old charts
  if(personChart) personChart.destroy();
  if(expChart) expChart.destroy();
  // persondays bar
  const ctx1 = document.getElementById('persondaysChart').getContext('2d');
  personChart = new Chart(ctx1, { type:'bar', data:{ labels, datasets:[{ label:'Persondays', data:pd, backgroundColor:'#16a34a' }] }, options:{ responsive:true } });
  // expenditure line
  const ctx2 = document.getElementById('expenditureChart').getContext('2d');
  expChart = new Chart(ctx2, { type:'line', data:{ labels, datasets:[{ label:'Expenditure (₹ Cr)', data:exp, borderColor:'#0ea5a9', fill:false }] }, options:{ responsive:true } });
}

async function compareAll(){
  const data = await fetchJSON('/api/all_data');
  if(!data) return;
  const labels = data.map(r=> r.district);
  const pd = data.map(r=> r.persondays);
  const exp = data.map(r=> r.expenditure);
  if(compareChart) compareChart.destroy();
  const ctx = document.getElementById('compareChart').getContext('2d');
  compareChart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Persondays', data:pd, backgroundColor:'#2563eb' }, { label:'Expenditure (₹ Cr)', data:exp, backgroundColor:'#f97316' }] }, options:{ responsive:true } });
}

// on load - show comparison by default
window.addEventListener('load', ()=>{ compareAll(); });
