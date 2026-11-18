(()=>{
'use strict';
const API=location.hostname==='diddybludsmpwebsite.onrender.com'?'':'https://diddybludsmpwebsite.onrender.com';
const root=document.getElementById('wallet-root');
const storage={get(k){try{return sessionStorage.getItem(k)||''}catch{return''}},set(k,v){try{sessionStorage.setItem(k,v)}catch{}},remove(k){try{sessionStorage.removeItem(k)}catch{}}};
const keys={token:'db_wallet_session',code:'db_wallet_code',pending:'db_wallet_pending'};
let token=storage.get(keys.token),code=storage.get(keys.code),busy=false;
const incoming=location.hash.match(/^#wallet=([0-9a-f]{64})$/);
if(incoming){token='';storage.remove(keys.token);storage.remove(keys.pending);code=incoming[1];storage.set(keys.code,code);history.replaceState(null,'',location.pathname+location.search);}
const make=(parent,tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e};
const dialog=root?null:document.createElement('dialog');
if(dialog){dialog.id='db-wallet-dialog';document.body.append(dialog);const css=make(document.head,'style');css.textContent='#db-wallet-dialog{margin:auto;width:min(94vw,500px);max-height:90vh;overflow:auto;border:1px solid #674d91;background:#21172f;color:#fff;border-radius:12px;padding:24px}#db-wallet-dialog::backdrop{background:#000b}#db-wallet-dialog h2{font-weight:800;font-size:23px}.db-wallet-content{display:grid;gap:12px}.db-wallet-content button,.db-wallet-content input{border:1px solid #7155a0;padding:10px;border-radius:6px;color:white;background:#332449}.db-wallet-content button{cursor:pointer;background:#7250bc}.db-wallet-content button:disabled{opacity:.5}.db-wallet-content input{width:100%}.db-wallet-row{display:flex;gap:8px;flex-wrap:wrap}.db-wallet-content p{margin:0}#db-wallet-dialog [hidden]{display:none!important}';}
const container=root||dialog;
const area=make(container,'div');area.className='db-wallet-content';
const heading=make(area,'h2','DiddybludSMP account');
const info=make(area,'p','Use /gamble in Minecraft to receive a private sign-in link.');
const identity=make(area,'p','');
const money=make(area,'p','Minecraft balance: —'),wallet=make(area,'p','Website wallet: —');
const name=make(area,'input');name.placeholder='Minecraft username';name.autocomplete='username';name.maxLength=16;name.setAttribute('aria-label','Minecraft username');
const login=make(area,'button','Sign in');
const amount=make(area,'input');amount.placeholder='Whole amount of in-game money';amount.inputMode='numeric';amount.setAttribute('aria-label','Amount');
const row=make(area,'div');row.className='db-wallet-row';
const deposit=make(row,'button','Deposit'),withdraw=make(row,'button','Withdraw'),refresh=make(row,'button','Refresh balance'),logout=make(row,'button','Sign out');
const notice=make(area,'p','Transfers use in-game money only. The practice games are not connected to this wallet.');
const status=make(area,'p','');status.setAttribute('role','status');
if(dialog){const close=make(area,'button','Close');close.onclick=()=>dialog.close()}
const authControls=[amount,row,money,wallet,identity];
function fmt(v){try{return BigInt(v).toLocaleString('en-US')}catch{return '—'}}
function signedIn(yes){if(dialog){const b=document.querySelector('[data-db-wallet-anchor]')||[...document.querySelectorAll('button')].find(x=>!x.closest('#db-wallet-dialog')&&/^\s*sign in\s*$/i.test(x.textContent));if(b){b.dataset.dbWalletAnchor='1';b.textContent=yes?identity.textContent.replace(/^Signed in as /,''):'Sign in';}}name.hidden=yes;login.hidden=yes;authControls.forEach(e=>e.hidden=!yes);info.textContent=yes?'Manage your Minecraft and website balances.':'Use /gamble in Minecraft, open the private link, and enter your username.';login.disabled=!code;}
async function api(path,method='GET',data){
 const headers={};if(token)headers.Authorization='Bearer '+token;if(data!==undefined)headers['Content-Type']='application/json';
 const r=await fetch(API+'/api/wallet/'+path,{method,headers,cache:'no-store',credentials:'omit',...(data!==undefined?{body:JSON.stringify(data)}:{})});
 const obj=await r.json();if(!r.ok){const e=Error(obj.error||'Request failed');e.status=r.status;throw e}return obj;
}
function clear(){token='';storage.remove(keys.token);identity.textContent='';money.textContent='Minecraft balance: —';wallet.textContent='Website wallet: —';signedIn(false)}
function display(result){money.textContent='Minecraft balance: '+fmt(result.money);wallet.textContent='Website wallet: '+fmt(result.wallet)}
function lock(value){busy=value;for(const el of [deposit,withdraw,refresh,logout,amount])el.disabled=value}
function pending(){try{return JSON.parse(storage.get(keys.pending))}catch{return null}}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function run(kind){
 if(busy||!token)return;
 let op=pending();
 if(!op){let v=amount.value.trim();if(kind!=='balance'&&!/^[1-9]\d{0,12}$/.test(v)){status.textContent='Enter a positive whole number.';return}
 if(kind!=='balance'&&!confirm((kind==='deposit'?'Deposit ':'Withdraw ')+fmt(v)+' in-game money?'))return;
 op={id:crypto.randomUUID(),kind,amount:kind==='balance'?'0':v};storage.set(keys.pending,JSON.stringify(op));}
 lock(true);status.textContent='Waiting for Minecraft server confirmation…';
 try{
 let result=await api('request','POST',op);
 for(let i=0;!result.done&&i<30;i++){await sleep(2000);result=await api('status/'+op.id)}
 if(!result.done){status.textContent='Still pending. Use Refresh balance to check the same request.';return;}
 storage.remove(keys.pending);display(result.result);status.textContent=result.result.ok?(op.kind==='balance'?'Balances refreshed.':'Transfer completed.'):result.result.error||'Transfer declined.';
 }catch(e){status.textContent=e.message+' If the result is uncertain, refresh the same request.';if(e.status===401){clear()}else if([400,403,404,409,429,503].includes(e.status)){storage.remove(keys.pending);status.textContent=e.message+' Refresh your balance before retrying.';}}finally{lock(false)}
}
login.onclick=async()=>{login.disabled=true;status.textContent='Signing in…';try{const r=await api('login','POST',{name:name.value.trim(),code});storage.remove(keys.pending);token=r.token;storage.set(keys.token,token);storage.remove(keys.code);code='';identity.textContent='Signed in as '+r.name;signedIn(true);await run('balance')}catch(e){status.textContent=e.message;login.disabled=!code}};
deposit.onclick=()=>run('deposit');withdraw.onclick=()=>run('withdraw');refresh.onclick=()=>run('balance');
logout.onclick=async()=>{try{await api('logout','POST',{})}catch{}clear();storage.remove(keys.pending);status.textContent='Signed out.'};
async function open(){if(dialog&&!dialog.open)dialog.showModal();if(token){try{const r=await api('me');identity.textContent='Signed in as '+r.name;signedIn(true);await run('balance');return}catch{clear()}}signedIn(false);status.textContent=code?'Enter your Minecraft username.':'Run /gamble on the Minecraft server first.';}
signedIn(false);
if(dialog){document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.closest('#db-wallet-dialog'))return;if(b.dataset.dbWalletAnchor||/sign in/i.test(b.textContent+' '+(b.getAttribute('aria-label')||''))){e.preventDefault();e.stopImmediatePropagation();open()}},true);if(incoming)open();if(token&&!incoming){api('me').then(r=>{const b=[...document.querySelectorAll('button')].find(x=>/^\s*Sign in\s*$/i.test(x.textContent));if(b){b.dataset.dbWalletAnchor='1';b.textContent=r.name;}}).catch(()=>clear())}}
else open();
})();