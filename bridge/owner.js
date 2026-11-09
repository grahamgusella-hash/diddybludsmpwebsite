const ownerTab=document.getElementById('owner-payments');
const ownerLink=document.getElementById('owner-tab-link');
const ownerStatus=document.getElementById('owner-status');
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);
async function loadOwnerPayments(){
 try{
  const res=await fetch('/api/owner/payments',{cache:'no-store',credentials:'same-origin'});
  if(!res.ok){ownerTab.hidden=true;ownerLink.hidden=true;return;}
  const data=await res.json();
  ownerTab.hidden=false;ownerLink.hidden=false;
  document.getElementById('owner-total').textContent=money(data.verifiedGrossCents);
  document.getElementById('owner-available').textContent=money(data.availableCents);
  document.getElementById('owner-requests').textContent=String(data.requestCount||0);
  const container=document.getElementById('owner-orders');container.replaceChildren();
  for(const order of data.requests||[]){
   const row=document.createElement('div');row.className='ticket-msg';
   const label=document.createElement('strong');label.textContent='#'+order.id+' · '+order.player;
   const details=document.createElement('div');details.textContent=order.product+' · '+(order.status||'pending')+' · '+new Date(order.createdAt).toLocaleString();
   row.append(label,details);container.append(row);
  }
  if(!data.requests?.length)container.textContent='No purchase requests yet.';
  document.getElementById('owner-withdraw').disabled=true;
  ownerStatus.textContent='No payment processor connected. This page does not collect card details or send payouts.';
 }catch(e){ownerTab.hidden=true;ownerLink.hidden=true;}
}
loadOwnerPayments();
setInterval(()=>{if(!document.hidden&&!ownerTab.hidden)loadOwnerPayments();},30000);
