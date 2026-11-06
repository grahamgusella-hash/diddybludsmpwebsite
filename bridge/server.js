import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const env=(key,fallback='')=>process.env[key]||fallback;
const port=Number(env('PORT','3000'));
const secret=env('BRIDGE_SECRET');
const token=env('DISCORD_TOKEN');
if(!secret || secret.length<24 || !token){console.error('Set DISCORD_TOKEN and a random BRIDGE_SECRET of at least 24 characters.');process.exit(1);}
const dataFile=env('DATA_FILE','./bridge-data.json');
let db={players:[],online:0,updatedAt:null,orders:[],applications:[],queue:[],levelShop:null,leaderboards:{money:[],playtime:[],hearts:[]},applicationRoles:[]};
try{db={...db,...JSON.parse(fs.readFileSync(dataFile,'utf8'))};}catch(e){if(e.code!=='ENOENT')console.error('Could not read data file:',e.message);}
const save=()=>{try{const tmp=dataFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,dataFile);}catch(e){console.error('Data persistence failed:',e.message);}};
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
const chatId=env('DISCORD_CHAT_CHANNEL_ID'),announcementId=env('DISCORD_ANNOUNCEMENTS_CHANNEL_ID');
const appId=env('DISCORD_APPLICATIONS_CHANNEL_ID'),ordersId=env('DISCORD_ORDERS_CHANNEL_ID');
const staffRole=env('DISCORD_STAFF_ROLE_ID');
const allowedOrigin=env('SITE_ORIGIN','https://grahamgusella-hash.github.io');
const siteOrigins=new Set(['https://grahamgusella-hash.github.io',allowedOrigin]);
const corsOrigin=origin=>siteOrigins.has(origin)?origin:'null';
const recent=new Map();
const clean=(s,max=200)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const safeText=(s,max=200)=>clean(s,max).replace(/@/g,'＠');
const enqueue=(action)=>{db.queue.push({id:crypto.randomUUID(),...action});if(db.queue.length>300)db.queue=db.queue.slice(-300);save();};
const send=async(channelId,content)=>{if(!channelId||!client.isReady())return;try{const ch=await client.channels.fetch(channelId);if(ch?.isTextBased())await ch.send({content:content.slice(0,1900),allowedMentions:{parse:[]}});}catch(e){console.warn('Discord send:',e.message);}};
const reply=(res,status,payload,origin)=>{const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':corsOrigin(origin),'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};res.writeHead(status,headers);res.end(JSON.stringify(payload));};
// Public read-only endpoints may be embedded on GitHub Pages or a custom domain.
// Keep submissions and authenticated server routes restricted as before.
const publicReply=(res,status,payload)=>{
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Access-Control-Allow-Origin':'*'
  });
  res.end(JSON.stringify(payload));
};
// These endpoints do not use cookies. Cross-origin POST requests are allowed
// so custom-domain and GitHub Pages visitors can submit forms. The in-game
// one-time code authorizes level purchases; applications are rate-limited.
const publicWriteReply=(res,status,payload)=>{
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  });
  res.end(JSON.stringify(payload));
};
const verify=(input)=>{if(typeof input!=='string')return false;const a=Buffer.from(input),b=Buffer.from('Bearer '+secret);return a.length===b.length&&crypto.timingSafeEqual(a,b);};
const throttle=(ip)=>{const now=Date.now();const hist=(recent.get(ip)||[]).filter(t=>now-t<3600000);if(hist.length>=6)return true;hist.push(now);recent.set(ip,hist);if(recent.size>10000)recent.clear();return false;};
const body=async(req)=>{let s='';for await(const part of req){s+=part;if(s.length>18000)throw Error('Request too large');}return JSON.parse(s||'{}');};
const validPlayer=(s)=>/^[A-Za-z0-9_]{3,16}$/.test(s);
const VALID_PRODUCTS={starter:'Starter Rank',champion:'Champion Rank',legend:'Legend Rank',reward:'Reward Request'};
const commands=[
new SlashCommandBuilder().setName('mcannounce').setDescription('Send an announcement to Minecraft').addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)),
new SlashCommandBuilder().setName('mckick').setDescription('Kick an online Minecraft player').addStringOption(o=>o.setName('player').setDescription('Player username').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false)),
new SlashCommandBuilder().setName('approveorder').setDescription('Approve a manually verified website request').addStringOption(o=>o.setName('id').setDescription('Order ID').setRequired(true)),
new SlashCommandBuilder().setName('rejectorder').setDescription('Reject a website request').addStringOption(o=>o.setName('id').setDescription('Order ID').setRequired(true))
];
client.on(Events.ClientReady,async()=>{console.log('Discord connected as '+client.user.tag);const guild=env('DISCORD_GUILD_ID');if(guild){try{const rest=new REST({version:'10'}).setToken(token);await rest.put(Routes.applicationGuildCommands(client.user.id,guild),{body:commands.map(x=>x.toJSON())});console.log('Staff slash commands registered');}catch(e){console.error('Command registration:',e.message);}}});
client.on(Events.MessageCreate,m=>{if(m.author.bot||m.channelId!==chatId||!m.inGuild())return;const msg=safeText(m.content,220);if(msg)enqueue({type:'chat',text:'[Discord] '+safeText(m.member?.displayName||m.author.username,40)+': '+msg});});
client.on(Events.InteractionCreate,async i=>{
if(!i.isChatInputCommand()||!commands.some(c=>c.name===i.commandName))return;
const ok=i.inGuild()&&(i.memberPermissions?.has(PermissionFlagsBits.Administrator)||(staffRole&&i.member?.roles?.cache?.has(staffRole)));
if(!ok){await i.reply({content:'You are not authorized to use Minecraft staff commands.',ephemeral:true});return;}
const name=i.commandName;
if(name==='mcannounce'){const msg=safeText(i.options.getString('message'),250);if(!msg){await i.reply({content:'Message cannot be empty.',ephemeral:true});return;}enqueue({type:'announce',text:msg});await i.reply({content:'Queued announcement for Minecraft.',ephemeral:true});return;}
if(name==='mckick'){const player=i.options.getString('player');if(!validPlayer(player)){await i.reply({content:'Invalid Minecraft username.',ephemeral:true});return;}enqueue({type:'kick',player,reason:safeText(i.options.getString('reason')||'Removed by staff',100)});await i.reply({content:'Kick request queued (online players only).',ephemeral:true});return;}
const id=i.options.getString('id');const order=db.orders.find(o=>o.id===id);
if(!order){await i.reply({content:'Order ID not found.',ephemeral:true});return;}
if(order.status!=='pending'){await i.reply({content:'Request has already been processed.',ephemeral:true});return;}
if(name==='rejectorder'){order.status='rejected';order.staff=i.user.id;save();await i.reply({content:'Request rejected.',ephemeral:true});return;}
order.status='approved';order.staff=i.user.id;
if(order.product==='reward'){save();await i.reply({content:'Marked approved. Reward requests have no automatic in-game action; deliver manually.',ephemeral:true});return;}
const rank={starter:'starter',champion:'champion',legend:'legend'}[order.product];
enqueue({type:'rank',player:order.player,rank});
await i.reply({content:'Rank grant queued. **Confirm delivery in-game.** Ensure this request was separately verified before approval.',ephemeral:true});
});
client.login(token).catch(e=>console.error('Discord login failed:',e.message));
const server=http.createServer(async(req,res)=>{
const origin=req.headers.origin;
const url=new URL(req.url,'http://localhost');
if(req.method==='OPTIONS'){
  if(url.pathname.startsWith('/api/public/')){publicWriteReply(res,204,{});return;}
  reply(res,204,{},origin);return;
}
if(req.method==='GET'&&url.pathname==='/health'){publicReply(res,200,{ok:true,discord:client.isReady(),serverLastSeen:db.updatedAt});return;}
if(req.method==='GET'&&url.pathname==='/api/public/stats'){publicReply(res,200,{players:db.players,online:db.online,updatedAt:db.updatedAt});return;}
if(req.method==='GET'&&url.pathname==='/api/public/leaderboards'){publicReply(res,200,{leaderboards:db.leaderboards,updatedAt:db.updatedAt});return;}
if(req.method==='GET'&&url.pathname==='/api/public/level-shop'){publicReply(res,200,{shop:db.levelShop,updatedAt:db.updatedAt});return;}
if(req.method==='GET'&&url.pathname==='/api/public/application-roles'){
publicReply(res,200,{roles:db.applicationRoles,updatedAt:db.updatedAt});return;
}
if(url.pathname.startsWith('/api/server/')){
if(!verify(req.headers.authorization)){reply(res,401,{error:'Unauthorized'},origin);return;}
if(req.method==='POST'&&url.pathname==='/api/server/sync'){
try{const obj=await body(req);if(!Array.isArray(obj.players)||obj.players.length>250){reply(res,400,{error:'Invalid players'},origin);return;}
db.players=obj.players.map(p=>({name:clean(p.name,16),money:Number(p.money)||0,shards:Number(p.shards)||0,hearts:Number(p.hearts)||0,playtime:Math.max(0,Number(p.playtime)||0),levels:Math.max(0,Number(p.levels)||0),rank:clean(p.rank,40)})).filter(p=>validPlayer(p.name));
db.online=db.players.length;db.updatedAt=new Date().toISOString();
if(Array.isArray(obj.applicationRoles)){
 const seen=new Set();
 db.applicationRoles=obj.applicationRoles.slice(0,150).map(role=>({id:clean(role?.id,40),name:safeText(role?.name,60)}))
  .filter(role=>/^[A-Za-z0-9 _-]{2,40}$/.test(role.id)&&role.name.length>0)
  .filter(role=>{const key=role.id.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,100);
}

if(obj.leaderboards&&typeof obj.leaderboards==='object'){
  const updated={money:[],playtime:[],hearts:[]};
  for(const kind of Object.keys(updated)){
    const items=obj.leaderboards[kind];
    if(!Array.isArray(items))continue;
    updated[kind]=items.slice(0,10).map(row=>({
      name:clean(row?.name,16),
      value:Number(row?.value)
    })).filter(row=>validPlayer(row.name)&&Number.isSafeInteger(row.value)&&row.value>=0);
    updated[kind].sort((a,b)=>b.value-a.value);
  }
  db.leaderboards=updated;
}
if(obj.levelShop && Array.isArray(obj.levelShop.offers)){
  const offers=obj.levelShop.offers.slice(0,40).map(o=>({id:clean(o.id,32),name:safeText(o.name,70),type:clean(o.type,20),cost:Number(o.cost)})).filter(o=>/^[a-z0-9_-]{1,32}$/.test(o.id)&&['rank','money','shards'].includes(o.type)&&Number.isInteger(o.cost)&&o.cost>0);
  db.levelShop={offers,playtimeMinutes:Math.max(1,Number(obj.levelShop.playtimeMinutes)||30),moneyPerLevel:Math.max(1,Number(obj.levelShop.moneyPerLevel)||10000000)};
}
for(const line of (Array.isArray(obj.chat)?obj.chat.slice(0,20):[])){const msg=safeText(line,240);if(msg)await send(chatId,'🎮 '+msg);}
const ackIds=new Set((Array.isArray(obj.acks)?obj.acks:[]).slice(0,60).filter(id=>typeof id==='string'&&/^[0-9a-f-]{36}$/.test(id)));
if(ackIds.size)db.queue=db.queue.filter(command=>!ackIds.has(command.id));
const queue=db.queue.slice(0,30);save();reply(res,200,{commands:queue},origin);
}catch(e){reply(res,400,{error:'Invalid sync: '+e.message},origin);}return;}
reply(res,404,{error:'Not found'},origin);return;
}
if(req.method==='POST'&&url.pathname==='/api/public/level-purchase'){
const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0];
if(throttle(ip)){publicWriteReply(res,429,{error:'Too many requests. Try again later.'});return;}
try{
const v=await body(req),player=clean(v.player,16),code=clean(v.code,20).toUpperCase(),offer=clean(v.offer,32);
if(!validPlayer(player)||! /^[A-Z2-9]{10}$/.test(code)||! /^[a-z0-9_-]{1,32}$/.test(offer)){publicWriteReply(res,400,{error:'Enter a valid player, 10-character code, and reward.'});return;}
if(!db.updatedAt||Date.now()-new Date(db.updatedAt).getTime()>120000){publicWriteReply(res,503,{error:'Minecraft is not connected. Try again when the server is online.'});return;}
if(!db.levelShop?.offers.some(item=>item.id===offer)){publicWriteReply(res,400,{error:'Unknown or unavailable offer'});return;}
if(!db.players.some(p=>p.name.toLowerCase()===player.toLowerCase())){publicWriteReply(res,409,{error:'Join Minecraft before requesting a level reward.'});return;}
enqueue({type:'level_purchase',player,code,offer});
publicWriteReply(res,202,{ok:true,message:'Request queued. Stay online in Minecraft to receive confirmation. Levels are deducted only after code and balance verification.'});return;
}catch(e){publicWriteReply(res,400,{error:'Invalid submission'});return;}
}
if(req.method==='POST'&&(url.pathname==='/api/public/applications'||url.pathname==='/api/public/orders')){
const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0];if(throttle(ip)){publicWriteReply(res,429,{error:'Too many requests. Try again later.'});return;}
try{const v=await body(req);const player=clean(v.player,16),discord=clean(v.discord,80),notes=safeText(v.notes,1000);
if(!validPlayer(player)||discord.length<2||discord.length>80){publicWriteReply(res,400,{error:'Enter a valid Minecraft username and Discord username.'});return;}
const id=crypto.randomUUID().slice(0,8);
if(url.pathname.endsWith('/applications')){const role=clean(v.role,40);if(!db.applicationRoles.some(r=>r.id===role)||notes.length<15){publicWriteReply(res,400,{error:'Choose a role and write at least 15 characters.'});return;}db.applications.push({id,player,discord,role,notes,createdAt:new Date().toISOString()});db.applications=db.applications.slice(-500);save();await send(appId,'📋 **Application #'+id+'**\nMinecraft: '+player+'\nDiscord: '+safeText(discord,80)+'\nRole: '+role+'\n'+notes);publicWriteReply(res,201,{ok:true,id});return;}
const product=clean(v.product,24);if(!Object.hasOwn(VALID_PRODUCTS,product)){publicWriteReply(res,400,{error:'Invalid request type'});return;}
db.orders.push({id,player,discord,product,status:'pending',createdAt:new Date().toISOString()});db.orders=db.orders.slice(-500);save();
await send(ordersId,'🛒 **Unpaid / unverified request #'+id+'**\nMinecraft: '+player+'\nDiscord: '+safeText(discord,80)+'\nItem: '+VALID_PRODUCTS[product]+'\n**No payment was collected or verified.** Staff must verify eligibility before /approveorder.');
publicWriteReply(res,201,{ok:true,id,message:'Request submitted. This is not a purchase or payment confirmation.'});return;
}catch(e){publicWriteReply(res,400,{error:'Invalid submission: '+e.message});return;}
}
reply(res,404,{error:'Not found'},origin);
});
server.listen(port,()=>console.log('Bridge listening on '+port));
process.on('SIGTERM',()=>{save();client.destroy();server.close();});
