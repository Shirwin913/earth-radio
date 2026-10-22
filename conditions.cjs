const TTL=900000;
function parseFronts(text,now=Date.now()){
 const valid=text.match(/VALID\s+(\d{2})(\d{2})(\d{2})Z/);if(!valid)throw Error('Invalid bulletin');
 const year=new Date(now).getUTCFullYear(),month=+valid[1]-1,day=+valid[2],hour=+valid[3];
 const time=[year-1,year,year+1].map(y=>Date.UTC(y,month,day,hour)).sort((a,b)=>Math.abs(a-now)-Math.abs(b-now))[0];
 if(Math.abs(now-time)>24*3600000)throw Error('Stale analysis');
 const tokens=text.slice(valid.index+valid[0].length).match(/[A-Z]+|\d+/g)||[],features=[];let type=null,coords=[],pressure=null;
 function flush(){if(coords.length&&(type==='HIGHS'||type==='LOWS'||coords.length>1))features.push({type,coordinates:coords,pressure});coords=[]}
 for(const token of tokens){if(['HIGHS','LOWS','COLD','WARM','STNRY','OCFNT','TROF'].includes(token)){flush();type=token;pressure=null;continue}if(!type||!/^\d+$/.test(token))continue;
  if((type==='HIGHS'||type==='LOWS')&&token.length<=4){pressure=+token;continue}
  // The high-resolution bulletin stores tenths of degrees: NNNWWWW.
  if(token.length!==7)continue;const a=+token.slice(0,3)/10,b=-Number(token.slice(3))/10;if(a>90||b< -180)continue;
  coords.push([b,a]);if(type==='HIGHS'||type==='LOWS')flush();
 }flush();return {time:new Date(time).toISOString(),features,coverage:'北美及鄰近海域',source:'NOAA/NWS WPC'};
}
function createService(){const cache=new Map(),pending=new Map();let starts=[];
 async function handle(req,res,url){if(!['/api/conditions','/api/fronts'].includes(url.pathname))return false;
 const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 if(req.method!=='GET'){reply(405,{error:'get_required'});return true}
 let key,lat,lon,kind,span;
 if(url.pathname==='/api/fronts')key='fronts';else{lat=Number(url.searchParams.get('lat'));lon=Number(url.searchParams.get('lon'));kind=url.searchParams.get('kind');span=Number(url.searchParams.get('span')||30);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180||!['ocean','weather','point'].includes(kind)||![10,20,30,60].includes(span)){reply(400,{error:'invalid_query'});return true}lat=Math.round(lat*10)/10;lon=Math.round(lon*10)/10;key=[kind,lat,lon,span].join(':')}
 const old=cache.get(key);if(old&&Date.now()-old.at<TTL){reply(200,old.data);return true}
 try{
 if(!pending.has(key)){starts=starts.filter(t=>Date.now()-t<60000);if(starts.length>=12||pending.size>=3){reply(429,{error:'wait'});return true}starts.push(Date.now());
 const task=(async()=>{
  if(key==='fronts'){const r=await fetch('https://www.wpc.ncep.noaa.gov/discussions/codsus_hr',{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error();return parseFronts(await r.text())}
  const n=kind==='point'?1:kind==='ocean'?7:5,locations=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)locations.push({lat:Math.max(-85,Math.min(85,lat+(n===1?0:(y/(n-1)-.5)*span*2))),lon:((lon+(n===1?0:(x/(n-1)-.5)*span*2/Math.max(.5,Math.cos(lat*Math.PI/180)))+540)%360)-180});
  const marine=kind!=='weather',q=new URLSearchParams({latitude:locations.map(p=>p.lat.toFixed(3)).join(','),longitude:locations.map(p=>p.lon.toFixed(3)).join(','),current:marine?'ocean_current_velocity,ocean_current_direction,wave_height,sea_surface_temperature':'temperature_2m,weather_code,is_day,pressure_msl',timezone:'GMT',forecast_days:'1',...(marine?{cell_selection:'nearest',wind_speed_unit:'ms'}:{})});
  const r=await fetch((marine?'https://marine-api.open-meteo.com/v1/marine?':'https://api.open-meteo.com/v1/forecast?')+q,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('upstream');const raw=await r.json(),data=Array.isArray(raw)?raw:[raw];if(data.length!==locations.length)throw Error('incomplete');
  return {kind,center:{lat,lon},span,fetchedAt:Date.now(),nodes:data.map((d,i)=>({...locations[i],current:d.current||null,units:d.current_units||{},gridLatitude:d.latitude,gridLongitude:d.longitude})),source:marine?'Open-Meteo / Météo-France':'Open-Meteo'};
 })().then(data=>{cache.set(key,{at:Date.now(),data});if(cache.size>24)cache.delete(cache.keys().next().value);return data}).finally(()=>pending.delete(key));pending.set(key,task)}
 reply(200,await pending.get(key));
 }catch{reply(502,{error:'source_unavailable'})}return true;
 }return {handle};}
module.exports={createService,parseFronts};
