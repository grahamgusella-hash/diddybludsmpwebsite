const ticketsList=document.getElementById('ticket-list');
const ticketsNotice=document.getElementById('ticket-notice');
async function postTicket(id,action,message){
 const r=await fetch('/api/staff/ticket',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,message})});
 const json=await r.json();if(!r.ok)throw Error(json.error||'Ticket action failed');return json;
}
async function loadStaffTickets(){
 if(!ticketsList)return;
 try{
  const response=await fetch('/api/staff/tickets',{cache:'no-store',credentials:'same-origin'});
  if(response.status===401){ticketsNotice.textContent='Sign in with Discord to view support tickets.';ticketsList.replaceChildren();return;}
  const data=await response.json();if(!response.ok)throw Error(data.error||'Could not fetch tickets');
  ticketsList.replaceChildren();
  const tickets=Array.isArray(data.tickets)?data.tickets:[];
  tickets.sort((a,b)=>(a.status==='closed')-(b.status==='closed')||(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));
  for(const ticket of tickets){
   const card=document.createElement('article');
   const h=document.createElement('h3');h.textContent='#'+ticket.id+' · '+ticket.subject;card.append(h);
   const badge=document.createElement('span');badge.className='tag';badge.textContent=ticket.status;card.append(badge);
   for(const [key,value] of [['Player',ticket.player],['Category',ticket.category],['Updated',new Date(ticket.updatedAt).toLocaleString()]]){
    const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=key+': ';p.append(strong,document.createTextNode(String(value||'—')));card.append(p);
   }
   const history=document.createElement('div');history.className='chatlog';
   for(const msg of ticket.messages||[]){
    const line=document.createElement('div');line.className='ticket-msg';
    const who=document.createElement('strong');who.textContent=(msg.from==='staff'?'Staff':'Player')+' · '+(msg.name||'')+' · '+new Date(msg.at).toLocaleString();
    const content=document.createElement('div');content.textContent=msg.text||'';line.append(who,content);history.append(line);
   }
   card.append(history);
   const actionRow=document.createElement('div');actionRow.className='actions';
   if(ticket.status!=='closed'){
    const form=document.createElement('form');
    form.style.width='100%';
    const field=document.createElement('textarea');field.className='ticket-reply';field.maxLength=1500;field.required=true;field.placeholder='Write a private reply to the player…';
    const send=document.createElement('button');send.type='submit';send.textContent='Send Reply';form.append(field,send);
    form.addEventListener('submit',async e=>{
     e.preventDefault();send.disabled=true;
     try{await postTicket(ticket.id,'reply',field.value);await loadStaffTickets();ticketsNotice.textContent='Reply sent to ticket #'+ticket.id+'.';}
     catch(err){ticketsNotice.textContent=err.message;send.disabled=false;}
    });
    card.append(form);
   }
   const toggle=document.createElement('button');toggle.className='secondary';toggle.textContent=ticket.status==='closed'?'Reopen Ticket':'Close Ticket';
   toggle.addEventListener('click',async()=>{
    if(!confirm(toggle.textContent+' #'+ticket.id+'?'))return;
    toggle.disabled=true;
    try{await postTicket(ticket.id,ticket.status==='closed'?'reopen':'close','');await loadStaffTickets();ticketsNotice.textContent='Ticket updated.';}
    catch(err){ticketsNotice.textContent=err.message;toggle.disabled=false;}
   });actionRow.append(toggle);card.append(actionRow);ticketsList.append(card);
  }
  ticketsNotice.textContent=tickets.length+' ticket(s) loaded.';
 }catch(err){ticketsNotice.textContent='Unable to load tickets: '+err.message;}
}
document.getElementById('ticket-refresh').addEventListener('click',loadStaffTickets);
loadStaffTickets();
setInterval(()=>{if(!document.hidden&&!document.getElementById('review').hidden&&!document.querySelector('.ticket-reply:focus'))loadStaffTickets();},18000);
