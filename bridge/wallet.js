import crypto from 'node:crypto';
import fs from 'node:fs';
export function createWalletHandler({verify,body,bridgeUrl}){
 const configured=new URL(process.env.GAMBLE_SITE_URL||bridgeUrl+'/gamble');
 if(configured.protocol!=='https:'||configured.username||configured.password)throw Error('GAMBLE_SITE_URL must be HTTPS');
 const origins=new Set([new URL(bridgeUrl).origin,configured.origin]);
 const codes=new Map(),sessions=new Map(),jobs=new Map(),limits=new Map();
 const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
 const username=x=>typeof x==='string'&&/^[A-Za-z0-9_]{3,16}$/.test(x);
 const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
 const random=()=>crypto.randomBytes(32).toString('hex');
 const now=()=>Date.now();
 const bearer=req=>String(req.headers.authorization||'').match(/^Bearer ([0-9a-f]{64})$/)?.[1];
 const validToken=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
 const purge=()=>{for(const [k,v] of codes)if(v.expires<now())codes.delete(k);for(const [k,v] of sessions)if(v.expires<now())sessions.delete(k);for(const [k,v] of jobs)if(v.done&&v.completed<now()-3600000)jobs.delete(k);for(const [k,v] of limits)if(v<now()-60000)limits.delete(k);};
 const response=(req,res,status,data)=>{const o=req.headers.origin;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(origins.has(o)?{'Access-Control-Allow-Origin':o,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}:{})});res.end(JSON.stringify(data));};
 return async function wallet(req,res,url){
 const p=url.pathname;if(!p.startsWith('/api/wallet/')&&!p.startsWith('/api/server/wallet/')&&p!=='/gamble'&&p!=='/wallet-ui.js')return false;
 const send=(status,data)=>response(req,res,status,data);purge();
 try{
 if(req.method==='GET'&&(p==='/gamble'||p==='/wallet-ui.js')){
 const html=p==='/gamble';
 res.writeHead(200,{'Content-Type':html?'text/html; charset=utf-8':'application/javascript; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
 res.end(fs.readFileSync(new URL(html?'./wallet.html':'./wallet-ui.js',import.meta.url),'utf8'));return true;
 }
 if(p.startsWith('/api/server/wallet/')){
 if(!verify(req.headers.authorization)){send(401,{error:'Unauthorized'});return true;}
 if(req.method!=='POST'){send(405,{error:'Method not allowed'});return true;}
 const data=await body(req);
 if(p.endsWith('/link')){
 if(!uuid(data.uuid)||!username(data.name)){send(400,{error:'Invalid player'});return true;}
 if(codes.size>=2000){send(503,{error:'Too many login requests'});return true;}
 for(const [k,v] of codes)if(v.owner===data.uuid)codes.delete(k);
 const code=random();codes.set(hash(code),{owner:data.uuid,name:data.name,expires:now()+300000});
 const link=new URL(configured);link.hash='wallet='+code;send(200,{link:link.href});return true;
 }
 if(p.endsWith('/poll')){
 const accepted=[];
 for(const result of (Array.isArray(data.results)?data.results:[]).slice(0,100)){
 if(!uuid(result?.id))continue;
 const j=jobs.get(result.id);
 if(j&&j.owner===result.owner&&!j.done&&typeof result.ok==='boolean'&&/^\d{1,19}$/.test(result.money)&&/^\d{1,19}$/.test(result.wallet)){
 j.done=true;j.completed=now();j.result={ok:result.ok,money:result.money,wallet:result.wallet,error:String(result.error||'').slice(0,160)};
 }
 accepted.push(result.id);
 }
 const pending=[...jobs.values()].filter(j=>!j.done).slice(0,50).map(({id,owner,kind,amount})=>({id,owner,kind,amount}));
 send(200,{accepted,jobs:pending});return true;
 }
 send(404,{error:'Not found'});return true;
 }
 if(req.headers.origin&&!origins.has(req.headers.origin)){send(403,{error:'Website origin not configured'});return true;}
 if(req.method==='OPTIONS'){send(200,{});return true;}
 if(req.method==='POST'&&p==='/api/wallet/login'){
 const data=await body(req);
 if(!validToken(data.code)||!username(data.name)){send(400,{error:'Enter your Minecraft username and use a fresh /gamble link.'});return true;}
 const key=hash(data.code),v=codes.get(key);
 if(!v||v.expires<now()||v.name.toLowerCase()!==data.name.toLowerCase()){send(401,{error:'Invalid or expired link. Run /gamble again.'});return true;}
 if(sessions.size>=3000){send(503,{error:'Too many sessions'});return true;}
 codes.delete(key);const token=random();sessions.set(hash(token),{owner:v.owner,name:v.name,expires:now()+1800000});send(200,{token,name:v.name,expiresIn:1800});return true;
 }
 const token=bearer(req),session=token&&sessions.get(hash(token));
 if(!session||session.expires<now()){send(401,{error:'Sign in again using /gamble.'});return true;}
 if(req.method==='GET'&&p==='/api/wallet/me'){send(200,{name:session.name});return true;}
 if(req.method==='POST'&&p==='/api/wallet/logout'){sessions.delete(hash(token));send(200,{ok:true});return true;}
 if(req.method==='POST'&&p==='/api/wallet/request'){
 const data=await body(req);if(!uuid(data.id)||!['balance','deposit','withdraw'].includes(data.kind)){send(400,{error:'Invalid request'});return true;}
 const amount=data.kind==='balance'?'0':String(data.amount||'');
 if(data.kind!=='balance'&&(!/^[1-9]\d{0,12}$/.test(amount)||BigInt(amount)>1000000000000n)){send(400,{error:'Enter a whole amount from 1 to 1 trillion.'});return true;}
 const old=jobs.get(data.id);if(old){if(old.owner!==session.owner||old.kind!==data.kind||old.amount!==amount){send(409,{error:'Request mismatch'});return true;}send(200,{id:old.id,done:old.done,result:old.result});return true;}
 if([...jobs.values()].some(j=>j.owner===session.owner&&!j.done)){send(409,{error:'A request is already pending. Check status before transferring again.'});return true;}
 if(jobs.size>=3000||[...jobs.values()].filter(j=>!j.done).length>=250){send(503,{error:'Wallet temporarily busy'});return true;}
 if(now()-(limits.get(session.owner)||0)<1500){send(429,{error:'Wait a moment before another request'});return true;}
 limits.set(session.owner,now());const job={id:data.id,owner:session.owner,kind:data.kind,amount,done:false};jobs.set(job.id,job);send(202,{id:job.id,done:false});return true;
 }
 if(req.method==='GET'&&p.startsWith('/api/wallet/status/')){
 const j=jobs.get(p.slice('/api/wallet/status/'.length));if(!j||j.owner!==session.owner){send(404,{error:'Request not found; refresh your balance before trying again.'});return true;}
 send(200,{id:j.id,done:j.done,result:j.result});return true;
 }
 send(404,{error:'Not found'});return true;
 }catch(e){if(!res.headersSent)send(400,{error:'Request failed'});else res.end();return true;}
 };
}
