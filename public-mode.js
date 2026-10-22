// The server enforces read-only settings; this adapts the public interface.
(async()=>{
 try{
  const r=await fetch('/api/runtime');if(!r.ok||!(await r.json()).public)return;
  for(const id of ['shipConnect','shipArea','shipDisconnect','webcamConfig','webcamForget']){
   const el=document.getElementById(id);if(!el)continue;
   if(id==='shipConnect'||id==='webcamConfig'){const details=el.closest('details');if(details)details.hidden=true;else el.hidden=true}else el.hidden=true;
  }
  const panel=document.querySelector('.ship-panel');
  if(panel){const note=document.createElement('p');note.className='note';note.textContent='公開版貨船資料由站主管理，顯示固定訂閱區域；其他圖層可自由探索。';panel.prepend(note)}
 }catch{}
})();
