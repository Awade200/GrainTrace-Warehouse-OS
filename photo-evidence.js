/* GrainTrace photo-evidence MVP add-on. Browser demo only: photos remain on this device. */
(function(){
'use strict';
const MAX_SIDE=820, QUALITY=.65;
let draft=null;
const origRender=render, origSaveMill=window.saveMill;
const getBag=(bid)=>{for(const d of state.deliveries){const b=d.bags.find(x=>x.id===bid);if(b)return {d,b};}return null};
const evidence=(record,kind)=>record?.evidence?.[kind];
const safe=(x)=>esc(String(x??''));
const fmt=(v)=>Number(v||0).toLocaleString('en-GB',{maximumFractionDigits:3});
const photoField='<label class="field full">Required photo evidence <input id="gtPhoto" type="file" accept="image/*" capture="environment" required></label><p class="note">Show the PKS and its printed receipt clearly in the photo. This stage cannot be confirmed without the photograph. Retake if unclear.</p><div id="gtPreview" class="field full"></div>';
function photoForm(title,explanation,action){
 modal(title,'<p class="note">'+explanation+'</p>'+photoField+'<div class="modalactions"><button class="btn alt" type="button" onclick="gtPrintDraft()">⎙ Print receipt</button><button class="btn" type="button" onclick="'+action+'">Confirm with photo</button></div>');
 const input=document.getElementById('gtPhoto');
 input.addEventListener('change',()=>{const file=input.files[0];document.getElementById('gtPreview').textContent=file?'Selected: '+file.name+' · '+Math.round(file.size/1024)+' KB':'';});
}
function readPhoto(){
 return new Promise((resolve,reject)=>{
 const f=document.getElementById('gtPhoto')?.files?.[0];if(!f)return reject(Error('Take or upload a photograph before confirming.'));
 if(!f.type.startsWith('image/'))return reject(Error('Only image photographs are accepted.'));
 if(f.size>12000000)return reject(Error('Photo must be smaller than 12 MB.'));
 const reader=new FileReader();
 reader.onerror=()=>reject(Error('Could not open photograph.'));
 reader.onload=()=>{const img=new Image();img.onerror=()=>reject(Error('The selected image is invalid.'));img.onload=()=>{
 const ratio=Math.min(1,MAX_SIDE/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));
 canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
 resolve({data:canvas.toDataURL('image/jpeg',QUALITY),name:f.name,capturedAt:new Date().toISOString(),demoLocalOnly:true});
 };img.src=reader.result;};reader.readAsDataURL(f);
 });
}
function printable(title,body){
 const w=window.open('','_blank');if(!w)return alert('Allow pop-ups to print your receipt.');
 w.document.write('<!doctype html><html><head><title>'+safe(title)+'</title><style>body{font:14px Arial;padding:26px;color:#20362c}h1{color:#315d3a}table{border-collapse:collapse;width:100%;margin:18px 0}td,th{padding:8px;text-align:left;border-bottom:1px solid #ccc}strong{font-size:18px}@media print{button{display:none}}</style></head><body><h1>GrainTrace · PKS</h1><h2>'+safe(title)+'</h2>'+body+'<p>Prepared '+new Date().toLocaleString()+' · Evidence photo required before confirmation</p><button onclick="print()">Print / Save PDF</button></body></html>');w.document.close();
}
function tab(headers,rows){return '<table><tr>'+headers.map(x=>'<th>'+safe(x)+'</th>').join('')+'</tr>'+rows.map(a=>'<tr>'+a.map(x=>'<td>'+safe(x)+'</td>').join('')+'</tr>').join('')+'</table>';}
function saveWithPhoto(){try{save();return true}catch(e){alert('Could not save demo evidence: '+e.message);return false;}}
window.gtPrintDraft=function(){if(!draft)return;
 if(draft.kind==='gate'){const d=draft.record;printable('Gate receipt '+d.id,'<p>Mill: '+safe(supplier(d.supplierId))+' · '+safe(d.date)+'</p>'+tab(['Bag','Gate kg'],d.bags.map(b=>[b.id,fmt(b.before)]))+'<strong>Total: '+fmt(d.bags.reduce((a,b)=>a+b.before,0))+' kg</strong>');}
 if(draft.kind==='processing'){const b=draft.b;printable('Processing receipt '+b.id,'<p>Mill: '+safe(supplier(draft.delivery.supplierId))+'</p>'+tab(['Bag','Gate kg','Cleaned kg','Loss kg'],[[b.id,fmt(b.before),fmt(draft.weight),fmt(b.before-draft.weight)]]));}
 if(draft.kind==='dispatch'){const x=draft.record;printable('Dispatch receipt '+x.id,'<p>Buyer: '+safe(x.recipient)+' · '+safe(x.date)+'</p>'+tab(['Source mill','Bag','Outgoing kg'],x.lines.map(l=>{const r=getBag(l.bagId);return [r?supplier(r.d.supplierId):'Unknown',l.bagId,fmt(l.weight)]}))+'<strong>Outbound: '+fmt(x.outbound)+' kg</strong>');}
};
window.saveMill=function(e,sid){
 e.preventDefault();const values=Object.fromEntries(new FormData(e.target)),old=state.suppliers.find(s=>s.id===sid);
 const lat=Number(values.latitude),lon=Number(values.longitude);
 if(values.latitude===''||values.longitude===''||!validCoords(lat,lon))return alert('Mill GPS coordinates are required.');
 const file=e.target.querySelector('[name=millPhoto]')?.files?.[0];
 if(!file && !old?.evidence?.mill)return alert('A mill/site photograph is required before saving its profile.');
 if(file && (!file.type.startsWith('image/')||file.size>12000000))return alert('Select a valid mill photograph smaller than 12 MB.');
 if(!file)return origSaveMill(e,sid);
 const input=document.getElementById('millPhoto')||e.target.querySelector('[name=millPhoto]');
 const photoReader=new FileReader();photoReader.onload=()=>{
 const img=new Image();img.onload=()=>{
 const cv=document.createElement('canvas'),r=Math.min(1,MAX_SIDE/Math.max(img.width,img.height));cv.width=Math.max(1,Math.round(img.width*r));cv.height=Math.max(1,Math.round(img.height*r));cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
 const existing=state.suppliers.find(s=>s.id===sid);
 if(!existing){const s={id:id('MILL'),docs:[],evidence:{mill:{data:cv.toDataURL('image/jpeg',QUALITY),capturedAt:new Date().toISOString(),demoLocalOnly:true}}};Object.assign(s,values,{latitude:lat,longitude:lon});state.suppliers.push(s);event('Mill','Photo-verified profile: '+s.name);}
 else{Object.assign(existing,values,{latitude:lat,longitude:lon});existing.evidence={...(existing.evidence||{}),mill:{data:cv.toDataURL('image/jpeg',QUALITY),capturedAt:new Date().toISOString(),demoLocalOnly:true}};event('Mill','Photo updated: '+existing.name);}
 closeModal();view='Suppliers';save();
 };img.onerror=()=>alert('Image is unreadable');img.src=photoReader.result;
 };photoReader.onerror=()=>alert('Photo could not be read');photoReader.readAsDataURL(file);
};
window.editMill=(function(original){return function(sid){original(sid);const f=document.getElementById('millform');if(!f)return;const s=state.suppliers.find(x=>x.id===sid);
 const p=document.createElement('label');p.className='field full';p.innerHTML='Mill/site photograph '+(s?.evidence?.mill?'(saved; replace if needed)':'(required)')+'<input id="millPhoto" name="millPhoto" type="file" accept="image/*" capture="environment" '+(s?.evidence?.mill?'':'required')+'>';const fields=f.querySelector('.fields');fields.appendChild(p);
 if(s?.evidence?.mill){const img=document.createElement('img');img.src=s.evidence.mill.data;img.alt='Stored mill site photo';img.style.cssText='width:170px;max-height:120px;object-fit:cover;border-radius:10px';fields.appendChild(img);}
 };})(window.editMill);
window.openSupplier=()=>window.editMill('');
window.finishReceive=function(e){e.preventDefault();if(!pending)return alert('Start the gate entry again.');
 const v=Object.fromEntries(new FormData(e.target)),dId=id('PKS'),n=Number(pending.count);
 const bs=Array.from({length:n},(_,i)=>({id:dId+'-B'+String(i+1).padStart(3,'0'),before:Number(v['b'+i]),after:null,remaining:0}));
 if(bs.some(b=>!Number.isFinite(b.before)||b.before<=0))return alert('Every bag needs a valid positive weight.');
 const s=state.suppliers.find(x=>x.id===pending.supplierId);
 if(!s?.evidence?.mill)return alert('This mill needs a site photograph before receiving PKS.');
 draft={kind:'gate',record:{id:dId,supplierId:pending.supplierId,product:'Palm Kernel Shells (PKS)',date:pending.date,bags:bs,payment:{status:'Pending'}}};
 photoForm('Gate · Print and photograph','Print the gate receipt, place it with all the bags, then capture a photograph showing the goods and receipt.','gtConfirmStage()');
};
window.finishProcess=function(e){e.preventDefault();const v=Object.fromEntries(new FormData(e.target)),r=getBag(v.bagId),a=Number(v.after);
 if(!r||r.b.after!==null||!Number.isFinite(a)||a<0||a>r.b.before)return alert('Invalid cleaned weight.');
 if(!r.d.evidence?.gate)return alert('Gate photo is required before processing this delivery.');
 draft={kind:'processing',delivery:r.d,b:r.b,weight:a};
 photoForm('Processing · Print and photograph','Print the cleaned-weight receipt. Photograph the cleaned PKS and its receipt before adding it to inventory.','gtConfirmStage()');
};
window.finishDispatch=function(e){e.preventDefault();const v=Object.fromEntries(new FormData(e.target)),lines=[];let total=0;
 for(const b of bags()){const w=Number(v['stock_'+b.id]||0);if(!Number.isFinite(w)||w<0||w>b.remaining+0.000001)return alert('Invalid source allocation: '+b.id);
 if(w>0){const r=getBag(b.id);if(!r?.b.evidence?.processing)return alert('Processing photo missing for '+b.id);lines.push({bagId:b.id,weight:w});total+=w;}}
 const outbound=Number(v.outbound);
 if(!v.recipient?.trim()||!Number.isFinite(outbound)||outbound<=0||!lines.length)return alert('Enter buyer, valid outbound weight and bag allocations.');
 if(Math.abs(total-outbound)>0.001)return alert('Allocated total '+fmt(total)+' kg differs from outbound '+fmt(outbound)+' kg.');
 draft={kind:'dispatch',record:{id:id('DSP'),recipient:v.recipient.trim(),date:v.date,outbound,lines}};
 photoForm('Dispatch · Print and photograph','Print the dispatch receipt. Photograph the outgoing PKS with the receipt before stock is deducted.','gtConfirmStage()');
};
window.gtConfirmStage=async function(){
 if(!draft)return;const cur=draft;let img;
 try{img=await readPhoto()}catch(e){return alert(e.message);}
 if(cur!==draft)return;
 const proof={...img,stage:cur.kind};
 if(cur.kind==='gate'){
 cur.record.evidence={gate:proof};state.deliveries.push(cur.record);
 event('Gate',cur.record.id+' confirmed with photo');
 }else if(cur.kind==='processing'){
 if(cur.b.after!==null)return alert('Bag already processed.');
 cur.b.after=cur.weight;cur.b.remaining=cur.weight;cur.b.processedAt=new Date().toISOString();cur.b.evidence={...(cur.b.evidence||{}),processing:proof};
 event('Processing',cur.b.id+' cleaned with photo');
 }else{
 for(const line of cur.record.lines){const r=getBag(line.bagId);if(!r||r.b.remaining+0.000001<line.weight)return alert('Stock changed; redo dispatch allocation.');}
 for(const line of cur.record.lines){const r=getBag(line.bagId);r.b.remaining=Math.round((r.b.remaining-line.weight)*1000)/1000;}
 cur.record.evidence={dispatch:proof};state.dispatches.push(cur.record);
 event('Dispatch',cur.record.id+' confirmed with photo');
 }
 draft=null;closeModal();view=cur.kind==='gate'?'Receiving':cur.kind==='processing'?'Processing':'Dispatch';saveWithPhoto();
};
window.gtViewEvidence=function(kind,idValue){
 let p;if(kind==='mill')p=state.suppliers.find(x=>x.id===idValue)?.evidence?.mill;
 if(kind==='gate')p=state.deliveries.find(x=>x.id===idValue)?.evidence?.gate;
 if(kind==='processing')p=getBag(idValue)?.b.evidence?.processing;
 if(kind==='dispatch')p=state.dispatches.find(x=>x.id===idValue)?.evidence?.dispatch;
 if(!p)return alert('No verified photo stored for this stage.');
 modal('Photo evidence · '+safe(kind),'<p class="note">Captured '+safe(p.capturedAt)+' · Browser demo storage only</p><img src="'+p.data+'" style="width:100%;max-height:65vh;object-fit:contain;border-radius:10px" alt="Stage evidence"><div class="modalactions"><button class="btn alt" onclick="closeModal()">Close</button></div>');
};
function enhanced(){
 origRender();const app=document.getElementById('app');if(!app)return;
 let extras='';
 if(view==='Suppliers'){extras='<h2 style="margin:22px 0 12px">Mill site photo evidence</h2>'+tbl(['Mill','Site photo'],state.suppliers.map(s=>'<tr><td>'+safe(s.name)+'</td><td>'+(evidence(s,'mill')?'<button class="actionlink" onclick="gtViewEvidence(\'mill\',\''+safe(s.id)+'\')">View photo</button>':'<span class="tag amber">Photo needed</span>')+'</td></tr>'));}
 if(view==='Receiving'){extras='<h2 style="margin:22px 0 12px">Gate photo verification</h2>'+tbl(['Receipt','Photo evidence'],state.deliveries.map(d=>'<tr><td>'+safe(d.id)+'</td><td>'+(evidence(d,'gate')?'<button class="actionlink" onclick="gtViewEvidence(\'gate\',\''+safe(d.id)+'\')">View gate photo</button>':'<span class="tag amber">Legacy / missing photo</span>')+'</td></tr>'));}
 if(view==='Processing'){extras='<h2 style="margin:22px 0 12px">Processing photo verification</h2>'+tbl(['Bag','Processing evidence'],bags().filter(b=>b.after!==null).map(b=>'<tr><td>'+safe(b.id)+'</td><td>'+(evidence(b,'processing')?'<button class="actionlink" onclick="gtViewEvidence(\'processing\',\''+safe(b.id)+'\')">View photo</button>':'<span class="tag amber">Legacy / missing photo</span>')+'</td></tr>'));}
 if(view==='Dispatch'){extras='<h2 style="margin:22px 0 12px">Dispatch photo verification</h2>'+tbl(['Dispatch','Photo evidence'],state.dispatches.map(d=>'<tr><td>'+safe(d.id)+'</td><td>'+(evidence(d,'dispatch')?'<button class="actionlink" onclick="gtViewEvidence(\'dispatch\',\''+safe(d.id)+'\')">View photo</button>':'<span class="tag amber">Legacy / missing photo</span>')+'</td></tr>'));}
 if(extras)app.insertAdjacentHTML('beforeend','<div class="panel" style="margin-top:20px">'+extras+'</div>');
}
render=enhanced;render();
})();
/* Guided first-use path: GPS is requested only from an explicit user click. */
(function(){
'use strict';
window.openReceive=function(){
 const eligible=state.suppliers.filter(s=>s.status==='Approved'&&s.latitude!==undefined&&s.longitude!==undefined&&validCoords(Number(s.latitude),Number(s.longitude))&&s.evidence?.mill?.data);
 if(!eligible.length){
  modal('Before receiving PKS','<div class="insight"><b>No approved, photo-verified mill is ready yet.</b><p class="note">Register a mill, capture its GPS location, attach the required site photo and set its status to Approved. Then you can record bags at the gate.</p></div><div class="modalactions"><button class="btn alt" onclick="closeModal()">Close</button><button class="btn" onclick="closeModal();show(\'Suppliers\');openSupplier()">＋ Register a mill →</button></div>');
  return;
 }
 modal('Gate · Receive PKS','<form onsubmit="receiveStep(event)"><div class="fields">'+select('Approved mill','supplierId',eligible.map(s=>[s.id,s.name]))+field('Product','product','text','Palm Kernel Shells (PKS)')+field('Gate receipt date','date','date',today())+field('Number of bags (1–100)','count','number','2')+'</div><div class="modalactions"><button class="btn">Weigh individual bags →</button></div></form>');
};
window.millGPS=function(){
 if(!navigator.geolocation)return alert('GPS is not supported in this browser. Please enter verified coordinates instead.');
 const button=document.querySelector('#millform button[onclick="millGPS()"]');
 if(button){button.disabled=true;button.textContent='⌾ Requesting GPS…';}
 navigator.geolocation.getCurrentPosition(p=>{
  const a=document.getElementById('milllat'),b=document.getElementById('milllon');
  if(a&&b){a.value=p.coords.latitude.toFixed(7);b.value=p.coords.longitude.toFixed(7);alert('GPS location captured. Now add the mill photograph and save.');}
  if(button){button.disabled=false;button.textContent='⌾ Capture GPS';}
 },e=>{
  if(button){button.disabled=false;button.textContent='⌾ Capture GPS';}
  alert('GPS could not be captured: '+e.message+'. Check Chrome site location permissions or enter verified coordinates.');
 },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
};
})();