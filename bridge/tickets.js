let auth=null;
const notice=document.getElementById('notice'),room=document.getElementById('room');
const createForm=document.getElementById('create'),accessForm=document.getElementById('access');
const replyForm=document.getElementById('reply'),conversation=document.getElementById('conversation');
async function api(path,payload){
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)});
 let result={};try{result=await response.json()}catch{throw Error('Could not reach ticket server.');}
 if(!response.ok)throw Error(result.error||'Ticket request failed.');
 return result;
}
function show(ticket){
 room.hidden=false;
 document.getElementById('ticket-heading').textContent='#'+ticket.id+' · '+ticket.subject;
 document.getElementById('ticket-state').textContent='Status: '+ticket.status+' · '+ticket.category+' · Last activity: '+new Date(ticket.updatedAt).toLocaleString();
 const scroll=conversation.scrollTop,nearBottom=scroll+conversation.clientHeight>=conversation.scrollHeight-60;
 conversation.replaceChildren();
 for(const msg of ticket.messages||[]){
  const item=document.createElement('div');item.className='message';
  const heading=document.createElement('strong');heading.textContent=(msg.from==='staff'?'Staff':'Player')+' · '+(msg.name||'')+' · '+new Date(msg.at).toLocaleString();
  const text=document.createElement('div');text.textContent=msg.text||'';item.append(heading,text);conversation.append(item);
 }
 if(nearBottom)conversation.scrollTop=conversation.scrollHeight;
 replyForm.hidden=ticket.status==='closed';
}
createForm.addEventListener('submit',async e=>{
 e.preventDefault();const button=createForm.querySelector('button');button.disabled=true;notice.textContent='Creating your ticket…';
 try{
  const data=await api('/api/tickets/create',Object.fromEntries(new FormData(createForm)));
  auth={id:data.id,code:data.code};show(data.ticket);createForm.reset();
  document.getElementById('new-id').textContent=data.id;
  document.getElementById('new-code').textContent=data.code;
  document.getElementById('receipt').hidden=false;
  notice.textContent='Ticket created. Save your ID and private code before leaving this page.';
 }catch(err){notice.textContent=err.message;}finally{button.disabled=false;}
});
accessForm.addEventListener('submit',async e=>{
 e.preventDefault();const button=accessForm.querySelector('button');button.disabled=true;notice.textContent='Opening ticket…';
 try{
  const form=Object.fromEntries(new FormData(accessForm));
  const result=await api('/api/tickets/access',form);
  auth=form;show(result.ticket);
  accessForm.querySelector('input[name="code"]').value='';
  document.getElementById('receipt').hidden=true;notice.textContent='Ticket opened.';
 }catch(err){notice.textContent=err.message;}finally{button.disabled=false;}
});
replyForm.addEventListener('submit',async e=>{
 e.preventDefault();if(!auth)return;
 const button=replyForm.querySelector('button'),field=replyForm.querySelector('textarea');
 button.disabled=true;notice.textContent='Sending reply…';
 try{
  const result=await api('/api/tickets/reply',{...auth,message:field.value});
  field.value='';show(result.ticket);notice.textContent='Reply sent.';
 }catch(err){notice.textContent=err.message;}finally{button.disabled=false;}
});
document.getElementById('copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText('Diddyblud ticket: '+location.origin+'/tickets | ID: '+auth.id+' | Code: '+auth.code);notice.textContent='Ticket details copied. Keep them private.';}
 catch{notice.textContent='Clipboard access unavailable. Copy the ticket ID and access code manually.';}
});
document.getElementById('leave').addEventListener('click',()=>{
 auth=null;room.hidden=true;document.getElementById('receipt').hidden=true;conversation.replaceChildren();notice.textContent='Ticket closed on this device. Save your access details to return.';
});
setInterval(async()=>{
 if(!auth||document.hidden)return;
 try{show((await api('/api/tickets/access',auth)).ticket);}catch(err){notice.textContent=err.message;}
},12000);
