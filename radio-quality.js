(function(){
function bitrate(s){const n=Number(s?.bitrate);return Number.isFinite(n)&&n>0&&n<=10000?n:0}
function name(s){return String(s?.name||'').normalize('NFKC').toLowerCase().replace(/\b\d{2,4}\s*(?:kbps|kbit(?:\/s)?|kb\/s)\b/g,'').replace(/\b(?:mp3|aac\+?|flac|opus|ogg|high quality|hq)\b/g,'').replace(/[\s()[\]_-]+/g,' ').trim()}
function homepage(s){try{const u=new URL(s.homepage);return u.hostname.replace(/^www\./,'').toLowerCase()+u.pathname.replace(/\/$/,'')}catch{return ''}}
function sameStation(a,b){if(a.stationuuid===b.stationuuid)return true;if(!name(a)||name(a)!==name(b)||!a.country||a.country!==b.country)return false;const ha=homepage(a),hb=homepage(b);if(ha&&hb)return ha===hb;return a.state===b.state&&[a.geo_lat,a.geo_long,b.geo_lat,b.geo_long].every(Number.isFinite)&&Math.abs(a.geo_lat-b.geo_lat)<.03&&Math.abs(a.geo_long-b.geo_long)<.03}
function sourceUrl(s){return s.url_resolved||s.url||''}
function rank(s){return String(s.codec).toUpperCase()==='FLAC'?100000+bitrate(s):bitrate(s)}
function choices(station,all,preferred,playable=()=>true){const rows=all.filter(s=>sameStation(station,s)&&/^https:\/\//i.test(sourceUrl(s))&&s.lastcheckok===1&&s.hls!==1&&playable(s));if(!rows.some(s=>s.stationuuid===station.stationuuid))rows.push(station);rows.sort((a,b)=>rank(b)-rank(a));const candidates=preferred?rows:[station,...rows];const urls=new Set();return candidates.filter(s=>{const url=sourceUrl(s);if(urls.has(url))return false;urls.add(url);return true})}
function description(s){return [s.codec||'格式未知',bitrate(s)?bitrate(s)+' kbps':'位元率未提供'].join(' · ')}
if(typeof module!=='undefined'&&module.exports){module.exports={bitrate,sameStation,choices,description};return}
let preferred=true;try{preferred=localStorage.getItem('earth-radio-high-bitrate')!=='false'}catch{}
const box=document.createElement('section');box.className='radio-quality';box.innerHTML='<label><input type="checkbox" id="radioHighQuality"> 優先較高位元率音源</label><small>依電台公布的格式與位元率選擇；不同編碼的數字不代表相同音質。</small><p id="radioQualityStatus" role="status">選擇電台後顯示音源資訊。</p>';
document.querySelector('.radio-content').prepend(box);const checkbox=box.querySelector('input'),status=box.querySelector('p');checkbox.checked=preferred;
const css=document.createElement('style');css.textContent='.radio-quality{margin:12px 0 18px;padding:12px;border:1px solid #58725166;border-radius:10px;background:#102c2255;pointer-events:auto}.radio-quality label{font-size:12px;display:flex;gap:6px;align-items:center}.radio-quality small{display:block;font-size:10px;color:#a5b8a5;line-height:1.5;margin:7px 0}.radio-quality p{font-size:11px;white-space:pre-line;margin:6px 0;color:#d4e5c4}';document.head.append(css);
const playerQuality=document.createElement('small');playerQuality.id='playerQuality';document.querySelector('.track').append(playerQuality);
let candidates=[],attempt=0,current=null;
function playable(s){const codec=String(s.codec||'').toUpperCase(),types={MP3:'audio/mpeg',AAC:'audio/aac','AAC+':'audio/aac',FLAC:'audio/flac',OGG:'audio/ogg; codecs="vorbis"',OPUS:'audio/ogg; codecs="opus"'};return !types[codec]||audio.canPlayType(types[codec])!==''}
function show(fallback=false){if(!current)return;const text=description(current);status.textContent=(fallback?'前一音源無法播放，已嘗試替代音源：':'目前音源：')+text+'\n'+(candidates.length>1?'已辨識 '+candidates.length+' 個同台 HTTPS 音源。':'清單中尚無可確認的其他同台音源。');playerQuality.textContent=text}
window.radioQualityLabel=description;
window.radioPreferredStation=function(station){candidates=choices(station,stations,preferred,playable);attempt=0;current=candidates[0]||station;show();return current};
window.radioTryNextSource=function(){if(!selected||!current||attempt>=Math.min(candidates.length-1,3))return false;current=candidates[++attempt];show(true);audio.src=sourceUrl(current);audio.load();const selection=playToken;document.querySelector('#status').textContent='正在嘗試同台替代音源…';audio.play().catch(e=>{if(selection===playToken&&e.name==='NotAllowedError')document.querySelector('#status').textContent='請按播放，繼續收聽'});return true};
render();
checkbox.onchange=()=>{preferred=checkbox.checked;try{localStorage.setItem('earth-radio-high-bitrate',String(preferred))}catch{}if(selected)select(selected,false)};
})();
