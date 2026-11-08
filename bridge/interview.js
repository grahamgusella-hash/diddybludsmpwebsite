let session=null;
const notice=document.getElementById('notice');
const access=document.getElementById('access'),room=document.getElementById('room');
const messages=document.getElementById('messages');
const submit=document.querySelector('#message-form button');
function render(data){
 const app=data.application;
 document.getElementById('room-title').textContent=app.player+' · '+app.role+' interview';
 document.getElementById('room-status').textContent='Status: '+app.interviewStatus+' · Application: '+app.applicationStatus;
 messages.replaceChildren();
 for(const msg of app.messages||[]){
  const item=document.createElement('div');item.className='message';
  const author=document.createElement('strong');author.textContent=(msg.from==='staff'?'Staff':'Applicant')+' · '+(msg.name||'')+' · '+(msg.at?new Date(msg.at).toLocaleTimeString():'');
  const text=document.createElement('div');text.textContent=msg.text||'';item.append(author,text);messages.append(item);
 }
 submit.disabled=app.interviewStatus!=='open';
 document.querySelector('#message-form textarea').disabled=app.interviewStatus!=='open';
 if(app.interviewStatus!=='open')notice.textContent='This interview is no longer open.';
}
async function request(path,payload){
 const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Request failed');return data;
}
document.getElementById('access-form').addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.currentTarget,input=Object.fromEntries(new FormData(form));notice.textContent='Joining…';
 try{
  const data=await request('/api/interview/access',input);
  session={id:input.id,code:input.code};
  form.querySelector('input[name="code"]').value='';
  room.hidden=false;access.hidden=true;notice.textContent='Connected. Messages refresh every 10 seconds.';
  render(data);
 }catch(err){notice.textContent=err.message;}
});
document.getElementById('message-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!session)return;
 const form=e.currentTarget,field=form.querySelector('textarea');submit.disabled=true;notice.textContent='Sending…';
 try{
  const data=await request('/api/interview/message',{...session,message:field.value});
  field.value='';render(data);notice.textContent='Reply sent.';
 }catch(err){notice.textContent=err.message;}finally{submit.disabled=false;}
});
document.getElementById('leave').addEventListener('click',()=>{
 session=null;room.hidden=true;access.hidden=false;messages.replaceChildren();notice.textContent='You have left the interview.';
});
setInterval(async()=>{
 if(!session||document.hidden)return;
 try{render(await request('/api/interview/access',session));}catch(err){
  if(err.message.includes('closed')||err.message.includes('Incorrect')){notice.textContent=err.message;session=null;submit.disabled=true;}else notice.textContent=err.message;
 }
},10000);
