'use strict';
const crypto = require('node:crypto');
const {getStore, connectLambda} = require('@netlify/blobs');
const DAYS = 7 * 86400;
const MAX_IMAGE = 2 * 1024 * 1024;
const password = process.env.ALBUM_PASSWORD || '';
const secret = process.env.SESSION_SECRET || '';
const adminPassword = process.env.ALBUM_ADMIN_PASSWORD || '';
const COOKIE = 'montse_session';
const hmac = x => crypto.createHmac('sha256',secret).update(x).digest('hex');
const eq = (a,b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(),crypto.createHash('sha256').update(b).digest());
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now = () => Math.floor(Date.now()/1000);
const baseHeaders = {'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Strict-Transport-Security':'max-age=31536000; includeSubDomains','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};
function response(body,status=200,type='text/html; charset=utf-8',headers={}) {return {statusCode:status,headers:{...baseHeaders,'Content-Type':type,...headers},body};}
const redirect = (location, cookie) => ({statusCode:303,headers:{...baseHeaders,Location:location,...(cookie?{'Set-Cookie':cookie}:{})},body:''});
const clearCookie = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
const styles = `<style>:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#38233f}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 8% 15%,#ffe16c,transparent 30%),radial-gradient(circle at 92% 25%,#ffa8b8,transparent 35%),linear-gradient(130deg,#ffdd91,#ffb5c6 48%,#c8f6e9);display:grid;place-items:center;padding:20px}.card{position:relative;background:rgba(255,255,255,.93);border:4px solid white;border-radius:28px;box-shadow:0 20px 65px #9d477b42;padding:clamp(24px,5vw,56px);max-width:780px;width:100%;text-align:center}h1{font-size:clamp(2.8rem,9vw,5.7rem);line-height:1.04;margin:12px 0;color:#e33282;letter-spacing:-.05em}h2{font-size:clamp(1.35rem,4vw,2.2rem);margin:8px 0 22px;color:#6240a2}.pill{display:inline-block;background:#ffdc60;border-radius:99px;padding:9px 18px;font-weight:800;transform:rotate(-3deg)}p{font-size:clamp(1rem,2.5vw,1.23rem);line-height:1.55}.love{color:#a02d71;font-weight:750}.btn{background:linear-gradient(90deg,#ed368a,#fc8650);color:white;border:0;border-radius:99px;padding:16px 28px;font-weight:800;font-size:1.08rem;cursor:pointer;box-shadow:0 8px 20px #d54c8055}.btn:hover{transform:translateY(-2px)}input{width:min(100%,350px);padding:14px;border:2px solid #e8b2d3;border-radius:14px;font-size:1.05rem;margin:8px 0 16px}.error{color:#a80043;font-weight:700}.stars{font-size:2.3rem}.confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden}.piece{position:absolute;top:-20px;width:10px;height:17px;animation:fall linear forwards}@keyframes fall{to{transform:translateY(110vh) rotate(650deg)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important}}.gallery{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}.gallery img{max-width:190px;max-height:190px;border-radius:12px;object-fit:cover}.muted{color:#795b77;font-size:.9rem}</style>`;
function page(inner){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Montse · ¡Felices 57!</title>${styles}</head><body><main class="card">${inner}</main><div id="confetti" class="confetti" aria-hidden="true"></div></body></html>`;}
const login = message => page(`<span class="pill">🎁 ¡Tenemos una sorpresa!</span><h1>¡Felices 57,<br>Montse!</h1><h2>La fiesta empieza aquí 🥳</h2><p>Hay 57 razones para celebrar… ¡y millones para quererte!</p><p>Esta aventura familiar tiene una llave secreta. 🔑</p><form method="post" action="/entrar"><label for="password"><b>Contraseña familiar</b></label><br><input id="password" type="password" name="password" autocomplete="current-password" required maxlength="200"><br><button class="btn" type="submit">¡Abrir mi regalo! 🎉</button></form>${message?`<p class="error" role="alert">${escapeHtml(message)}</p>`:''}<p class="muted">Con mucho cariño: Antonio, Raquel, Mar, Sofía y Mía 🐾</p>`);
function inside(photos){return page(`<span class="pill">🎉 ¡Sorpresa desbloqueada!</span><h1>¡Felices 57,<br>Montse!</h1><h2>31 años juntos… ¡y lo que nos queda! 💃</h2><div class="stars">🌸 🎂 💕 🐾 🌺</div><p>De las recetas que nos hacen felices a esos arreglos que solo tú sabes hacer. De nuestras risas a todos los recuerdos que seguimos construyendo.</p><p class="love">¡Te queremos muchísimo!</p><p>Antonio, Raquel, Mar, Sofía y Mía 🐾</p><button class="btn" onclick="celebrate()">¡Que llueva confeti! 🎊</button><p><a href="/media/prueba.svg" target="_blank" rel="noopener">🔒 Abrir imagen privada de prueba</a></p>${photos.length?`<h2>Nuestros recuerdos</h2><div class="gallery">${photos.map(k=>`<a href="/media/${encodeURIComponent(k)}" target="_blank" rel="noopener"><img loading="lazy" src="/media/${encodeURIComponent(k)}" alt="Recuerdo familiar"></a>`).join('')}</div>`:'<p class="muted">Próximamente: nuestro álbum interactivo de recuerdos.</p>'}<p><a href="/gestion">Gestionar fotografías (solo administrador)</a></p><form method="post" action="/salir"><button type="submit" style="background:none;border:0;text-decoration:underline;cursor:pointer;color:#6240a2">Cerrar sesión</button></form><script>function celebrate(){const c=document.getElementById('confetti');c.innerHTML='';for(let i=0;i<100;i++){let x=document.createElement('i');x.className='piece';x.style.left=Math.random()*100+'%';x.style.background=['#ef3b91','#ffd342','#54cdb5','#8861c7'][i%4];x.style.animationDuration=2+Math.random()*3+'s';x.style.animationDelay=Math.random()*.8+'s';c.appendChild(x)}setTimeout(()=>c.innerHTML='',6500)}celebrate()</script>`);}
const manage = () => page(`<h2>🔐 Gestión de fotografías</h2><p>Solo para quien tenga la contraseña de administración.</p><label>Contraseña de administración<br><input id="admin" type="password" autocomplete="off"></label><br><label>Seleccionar fotografía (JPG, PNG o WebP; máximo 2 MB)<br><input id="file" type="file" accept="image/jpeg,image/png,image/webp"></label><br><button class="btn" id="send" type="button">Subir fotografía privada</button><p id="result" role="status"></p><p><a href="/">Volver al álbum</a></p><script>document.getElementById('send').onclick=async()=>{const f=document.getElementById('file').files[0],p=document.getElementById('admin').value,r=document.getElementById('result');if(!f||!p){r.textContent='Selecciona una fotografía e introduce la contraseña de administración.';return}if(f.size>2097152){r.textContent='La imagen supera los 2 MB.';return}r.textContent='Subiendo…';try{const bytes=await f.arrayBuffer();const b64=btoa(Array.from(new Uint8Array(bytes),b=>String.fromCharCode(b)).join(''));const res=await fetch('/subir',{method:'POST',headers:{'Content-Type':'application/json','X-Album-Admin':p},body:JSON.stringify({name:f.name,type:f.type,data:b64})});r.textContent=res.ok?'Fotografía guardada. Vuelve al álbum para verla.':'No se pudo subir: '+res.status;}catch(e){r.textContent='Error de conexión.'}}</script>`);
function stores(event){connectLambda(event);return {sessions:getStore('montse-sesiones-v3'),limits:getStore('montse-intentos-v3'),photos:getStore('montse-fotos-privadas')};}
function sessionToken(event){const raw=(event.headers?.cookie||event.headers?.Cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));const token=raw?.slice(COOKIE.length+1)||'';return /^[a-f0-9]{64}$/.test(token)?token:null;}
async function authenticated(event,sessions){const token=sessionToken(event);if(!token)return null;const id=hmac('session:'+token);const session=await sessions.get(id,{type:'json'});if(!session||!Number.isSafeInteger(session.expires)||session.expires<=now())return null;return {id,session};}
function ipKey(event){const ip=event.headers?.['x-nf-client-connection-ip']||event.headers?.['client-ip']||event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()||'unknown';return hmac('ip:'+ip);}
// Persistent best-effort rate limit. Netlify Blobs does not guarantee atomic increments.
async function rateCheck(limits,key){const v=await limits.get(key,{type:'json'});return v&&v.until>now()&&v.count>=5?Math.max(1,v.until-now()):0;}
async function rateFail(limits,key){const old=await limits.get(key,{type:'json'});const fresh=!old||old.until<=now();const next={count:fresh?1:old.count+1,until:fresh?now()+900:old.until};await limits.setJSON(key,next);}
async function rateClear(limits,key){await limits.delete(key);}
function sameOrigin(event, requireOrigin=false){
  const headers=event.headers||{};
  const origin=headers.origin||headers.Origin;
  const fetchSite=headers['sec-fetch-site']||headers['Sec-Fetch-Site'];
  if(fetchSite && !['same-origin','none'].includes(fetchSite))return false;
  // The public Netlify URL is authoritative; the function Host header can be internal.
  const allowed = new Set();
  for(const value of [process.env.URL, process.env.DEPLOY_PRIME_URL, 'https://symphonious-youtiao-743102.netlify.app']){
    if(!value)continue;
    try {const u=new URL(value);if(u.protocol==='https:')allowed.add(u.origin);}catch{}
  }
  if(origin){
    try{return allowed.has(new URL(origin).origin) && new URL(origin).origin===origin;}catch{return false;}
  }
  // A standard HTML form may omit Origin; only login/logout allow that.
  return !requireOrigin;
}
function parseForm(event){const body=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):event.body||'';if(Buffer.byteLength(body)>1024)return null;return new URLSearchParams(body);}
function magic(buf,type){if(type==='image/jpeg')return buf.length>=4&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff;if(type==='image/png')return buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));if(type==='image/webp')return buf.length>=12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';return false;}
const types={'jpg':'image/jpeg','png':'image/png','webp':'image/webp'};
exports.handler=async event=>{
 try{
  if(!password||!secret||secret.length<32)return response('<h1>Configuración pendiente</h1>',503);
  const path=event.path||'/';const method=event.httpMethod||'GET';
  if(!['GET','POST'].includes(method))return response('Método no permitido',405);
  const {sessions,limits,photos}=stores(event);
  if(method==='POST'){
    if(!sameOrigin(event,path==='/subir'))return response('Origen no autorizado',403);
    if(path==='/entrar'){
      const key='login/'+ipKey(event);const wait=await rateCheck(limits,key);
      if(wait)return response(login('Demasiados intentos. Espera 15 minutos.'),429,'text/html; charset=utf-8',{'Retry-After':String(wait)});
      const form=parseForm(event);if(!form)return response('Solicitud demasiado grande',413);
      const supplied=form.get('password')||'';
      if(!eq(supplied,password)){await rateFail(limits,key);return response(login('Contraseña incorrecta. Inténtalo de nuevo.'),401);}
      await rateClear(limits,key);
      const token=crypto.randomBytes(32).toString('hex');const expires=now()+DAYS;
      await sessions.setJSON(hmac('session:'+token),{expires});
      return redirect('/',`${COOKIE}=${token}; Path=/; Max-Age=${DAYS}; HttpOnly; Secure; SameSite=Strict`);
    }
    if(path==='/salir'){
      const token=sessionToken(event);if(token)await sessions.delete(hmac('session:'+token));
      return redirect('/',clearCookie);
    }
    if(path==='/subir'){
      if(!await authenticated(event,sessions))return response('Acceso denegado',401);
      if(!adminPassword||adminPassword.length<16)return response('Administración no configurada',503);
      const key='admin/'+ipKey(event);const wait=await rateCheck(limits,key);
      if(wait)return response('Demasiados intentos',429,'text/plain; charset=utf-8',{'Retry-After':String(wait)});
      const supplied=event.headers?.['x-album-admin']||event.headers?.['X-Album-Admin']||'';
      if(!eq(supplied,adminPassword)){await rateFail(limits,key);return response('No autorizado',403);}
      await rateClear(limits,key);
      const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):event.body||'';
      if(Buffer.byteLength(raw)>MAX_IMAGE*1.5+10240)return response('Archivo demasiado grande',413);
      let item;try{item=JSON.parse(raw);}catch{return response('Solicitud incorrecta',400);}
      if(typeof item?.data!=='string'||typeof item?.type!=='string'||!/^[a-zA-Z0-9+/]*={0,2}$/.test(item.data))return response('Archivo incorrecto',400);
      const ext=Object.keys(types).find(e=>types[e]===item.type);
      if(!ext)return response('Formato no permitido',415);
      const buf=Buffer.from(item.data,'base64');if(!buf.length||buf.length>MAX_IMAGE||!magic(buf,item.type))return response('Imagen no válida',415);
      const file='fotos/'+crypto.randomUUID()+'.'+ext;
      await photos.set(file,buf);
      return response('Fotografía guardada',201,'text/plain; charset=utf-8');
    }
    return response('No encontrado',404);
  }
  if(path.startsWith('/media/')){
    if(!await authenticated(event,sessions))return response('<h1>Acceso denegado</h1>',401);
    if(path==='/media/prueba.svg'){
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="680" height="320"><rect width="680" height="320" fill="#ffe49e"/><text x="340" y="135" text-anchor="middle" font-family="sans-serif" font-size="45" fill="#a32d77">MONTSE 57</text><text x="340" y="210" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#5d376b">Imagen protegida de prueba</text></svg>';
      return response(svg,200,'image/svg+xml');
    }
    const key=decodeURIComponent(path.slice(7));
    if(!/^fotos\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key))return response('No encontrado',404);
    const buf=await photos.get(key,{type:'arrayBuffer'});if(!buf)return response('No encontrado',404);
    const ext=key.split('.').pop();return {...response(Buffer.from(buf).toString('base64'),200,types[ext]),isBase64Encoded:true};
  }
  if(path==='/gestion')return await authenticated(event,sessions)?response(manage()):redirect('/');
  if(path!=='/')return response('No encontrado',404);
  if(!await authenticated(event,sessions))return response(login(''));
  const listing=await photos.list({prefix:'fotos/'});
  const keys=(listing.blobs||[]).map(x=>x.key).filter(k=>/^fotos\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(k)).slice(0,100);
  return response(inside(keys));
 }catch(e){console.error('MONTSE_57:',e);return response('<h1>Servicio temporalmente no disponible</h1>',503);}
};
