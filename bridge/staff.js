const login=document.getElementById('login');
const reviews=document.getElementById('review');
const list=document.getElementById('app-list');
const notice=document.getElementById('notice');
const logout=document.getElementById('logout');
const params=new URLSearchParams(location.search);
if(params.get('error')){const error=document.createElement('p');error.textContent=params.get('error')==='not_staff'?'Your Discord account does not have the configured staff role or administrator permission.':'Discord login could not be completed. Check the bot configuration and try again.';login.append(error);}
function line(parent,label,value){
 const p=document.createElement('p');
 const strong=document.createElement('strong');strong.textContent=label+': ';
 p.append(strong,document.createTextNode(String(value||'—')));parent.append(p);
}
async function load(){
 notice.textContent='Loading applications…';
 try{
 const res=await fetch('/api/staff/applications',{cache:'no-store',credentials:'same-origin'});
 if(res.status===401){reviews.hidden=true;login.hidden=false;logout.hidden=true;notice.textContent='';return;}
 const data=await res.json();
 if(!res.ok)throw Error(data.error||'Could not load applications.');
 reviews.hidden=false;login.hidden=true;logout.hidden=false;
 document.getElementById('reviewer').textContent='Signed in as '+data.reviewer;
 list.replaceChildren();
 const apps=Array.isArray(data.applications)?data.applications:[];
 for(const app of apps){
  const card=document.createElement('article');
  const heading=document.createElement('h3');heading.textContent='#'+app.id+' · '+app.player;card.append(heading);
  const status=document.createElement('span');status.className='tag';status.textContent=app.status||'pending';card.append(status);
  line(card,'Discord',app.discord);
  line(card,'Role requested',app.role);
  line(card,'Submitted',app.createdAt?new Date(app.createdAt).toLocaleString():'');
  if(app.reviewedAt)line(card,'Reviewed',new Date(app.reviewedAt).toLocaleString());
  const heading2=document.createElement('p');heading2.textContent='Why they applied:';card.append(heading2);
  const notes=document.createElement('div');notes.className='answers';notes.textContent=app.notes||'';card.append(notes);
  if(!app.status||app.status==='pending'){
   const actions=document.createElement('div');actions.className='actions';
   for(const [decision,label] of [['accepted','Accept'],['denied','Deny']]){
    const button=document.createElement('button');button.textContent=label;
    if(decision==='denied')button.className='secondary';
    button.addEventListener('click',async()=>{
     if(!confirm(label+' application #'+app.id+' from '+app.player+'?'))return;
     for(const el of actions.querySelectorAll('button'))el.disabled=true;
     notice.textContent='Saving review…';
     try{
      const response=await fetch('/api/staff/review',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:app.id,decision})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Review failed');
      await load();
      notice.textContent='Application '+app.id+' '+decision+'.';
     }catch(err){notice.textContent=err.message;for(const el of actions.querySelectorAll('button'))el.disabled=false;}
    });actions.append(button);
   }
   card.append(actions);
  }
  list.append(card);
 }
 notice.textContent=apps.length+' application(s) loaded.';
 }catch(err){notice.textContent='Unable to load applications: '+err.message;}
}
document.getElementById('refresh').addEventListener('click',load);
load();
