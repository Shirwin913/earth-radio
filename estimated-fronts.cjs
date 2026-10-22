// Experimental diagnostic: not a reproduction of an operational frontal analysis.
const BOUNDS={south:15,north:51,west:95,east:155,step:3};
function thetaE(t,rh){if(!Number.isFinite(t)||!Number.isFinite(rh)||rh<=0||rh>100)return null;const k=t+273.15,e=rh/100*6.112*Math.exp(17.67*t/(t+243.5));if(e>=850)return null;const ratio=.622*e/(850-e),log=Math.log(e/6.112),dew=243.5*log/(17.67-log)+273.15,lcl=1/(1/(dew-56)+Math.log(k/dew)/800)+56;return k*Math.pow(1000/850,.2854*(1-.28*ratio))*Math.exp((3376/lcl-2.54)*ratio*(1+.81*ratio))}
function detectFronts(nodes,width,height,step=3){
 const at=(x,y)=>x>=0&&x<width&&y>=0&&y<height?nodes[y*width+x]:null;
 const values=nodes.map(n=>n&&n.pressure>870?thetaE(n.temperature,n.humidity):null),grad=Array(nodes.length).fill(null);
 const val=(x,y)=>x>=0&&x<width&&y>=0&&y<height?values[y*width+x]:null;
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const v=[val(x-1,y),val(x+1,y),val(x,y-1),val(x,y+1)];if(v.some(n=>!Number.isFinite(n)))continue;const dx=111.2*step*Math.cos(at(x,y).lat*Math.PI/180),dy=111.2*step,gx=(v[1]-v[0])/(2*dx),gy=(v[3]-v[2])/(2*dy);grad[y*width+x]={gx,gy,m:Math.hypot(gx,gy)*100}}
 const candidates=new Map();
 for(let y=2;y<height-2;y++)for(let x=2;x<width-2;x++){const id=y*width+x,g=grad[id],node=at(x,y);if(!g||g.m<2||!Number.isFinite(node.speed)||node.speed<2)continue;
  const horizontal=Math.abs(g.gx)>Math.abs(g.gy),sx=horizontal?1:0,sy=horizontal?0:1,left=grad[(y-sy)*width+x-sx],right=grad[(y+sy)*width+x+sx];
  if(!left||!right||g.m<left.m||g.m<=right.m)continue;
  const a=at(x-sx,y-sy),b=at(x+sx,y+sy);if(!Number.isFinite(a?.direction)||!Number.isFinite(b?.direction))continue;const turn=Math.abs(((a.direction-b.direction+540)%360)-180);if(turn<25)continue;
  const angle=node.direction*Math.PI/180,u=-node.speed*Math.sin(angle),v=-node.speed*Math.cos(angle),normalFlow=(u*g.gx+v*g.gy)/Math.hypot(g.gx,g.gy);
  candidates.set(id,{id,x,y,node,type:normalFlow>1.5?'COLD':normalFlow< -1.5?'WARM':'ESTIMATED',strength:g.m});
 }
 const features=[],unused=new Set(candidates.keys());
 const neighbors=c=>[...candidates.values()].filter(n=>unused.has(n.id)&&n.type===c.type&&Math.max(Math.abs(n.x-c.x),Math.abs(n.y-c.y))===1);
 while(unused.size){let seed=[...unused].map(id=>candidates.get(id)).find(c=>neighbors(c).length<=1)||candidates.get(unused.values().next().value),chain=[];while(seed){unused.delete(seed.id);chain.push(seed);seed=neighbors(seed).sort((a,b)=>b.strength-a.strength)[0]}if(chain.length>=3)features.push({type:chain[0].type,estimated:true,coordinates:chain.map(c=>[c.node.lon,c.node.lat]),strength:+(chain.reduce((s,c)=>s+c.strength,0)/chain.length).toFixed(2)})}
 return features;
}
function createService(){let cache=null,pending=null,lastAttempt=0;
 async function load(){const locations=[];for(let lat=BOUNDS.south;lat<=BOUNDS.north;lat+=BOUNDS.step)for(let lon=BOUNDS.west;lon<=BOUNDS.east;lon+=BOUNDS.step)locations.push({lat,lon});const nodes=[],times=new Set();
  for(let i=0;i<locations.length;i+=60){const batch=locations.slice(i,i+60),q=new URLSearchParams({latitude:batch.map(p=>p.lat).join(','),longitude:batch.map(p=>p.lon).join(','),hourly:'temperature_850hPa,relative_humidity_850hPa,wind_speed_850hPa,wind_direction_850hPa,surface_pressure',forecast_hours:'1',models:'gfs_global',wind_speed_unit:'ms',timezone:'GMT',cell_selection:'nearest'});const r=await fetch('https://api.open-meteo.com/v1/forecast?'+q,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('source_unavailable');const raw=await r.json(),items=Array.isArray(raw)?raw:[raw];if(items.length!==batch.length)throw Error('incomplete');for(let j=0;j<items.length;j++){const h=items[j].hourly;if(!h?.time?.[0])throw Error('missing_time');times.add(h.time[0]);nodes.push({...batch[j],temperature:h.temperature_850hPa?.[0],humidity:h.relative_humidity_850hPa?.[0],speed:h.wind_speed_850hPa?.[0],direction:h.wind_direction_850hPa?.[0],pressure:h.surface_pressure?.[0]})}}
  if(times.size!==1)throw Error('inconsistent_time');const time=[...times][0]+'Z';if(Math.abs(Date.now()-Date.parse(time))>10800000)throw Error('stale_model');const data={estimated:true,time,fetchedAt:Date.now(),bounds:BOUNDS,model:'GFS Global / Open-Meteo',resolutionDegrees:3,method:'850 hPa equivalent potential temperature gradient ridge ≥2 K/100 km + wind shift ≥25°, terrain mask; type from normal wind component; experimental, unvalidated',features:detectFronts(nodes,21,13),sampleCount:nodes.length};cache=data;return data;
 }
 async function handle(req,res,url){if(url.pathname!=='/api/estimated-fronts')return false;const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};if(req.method!=='GET'){reply(405,{error:'get_required'});return true}try{if(cache&&Date.now()-cache.fetchedAt<3600000){reply(200,cache);return true}if(!pending){if(Date.now()-lastAttempt<60000){reply(429,{error:'wait'});return true}lastAttempt=Date.now();pending=load().finally(()=>pending=null)}reply(200,await pending)}catch{reply(502,{error:'estimated_front_source_unavailable'})}return true}return {handle};
}
module.exports={thetaE,detectFronts,createService};
