const crypto = require('node:crypto');
const DAYS = 7 * 24 * 60 * 60;
const secret = process.env.SESSION_SECRET;
const password = process.env.FAMILY_PASSWORD;
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sign = v => crypto.createHmac('sha256', secret).update(v).digest('hex');
function authenticated(headers) {
  if (!secret) return false;
  const cookie = (headers.cookie || headers.Cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('montse_session='));
  if (!cookie) return false;
  const parts = cookie.slice('montse_session='.length).split('.');
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) return false;
  const [exp,mac] = parts;
  if (+exp < Math.floor(Date.now()/1000)) return false;
  return crypto.timingSafeEqual(Buffer.from(sign(exp),'hex'), Buffer.from(mac,'hex'));
}
const css = `<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#38233f}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 8% 15%,#ffe16c,transparent 30%),radial-gradient(circle at 92% 25%,#ffa8b8,transparent 35%),linear-gradient(130deg,#ffdd91,#ffb5c6 48%,#c8f6e9);display:grid;place-items:center;padding:20px}.card{position:relative;overflow:hidden;background:rgba(255,255,255,.91);border:4px solid white;border-radius:28px;box-shadow:0 20px 65px #9d477b42;padding:clamp(24px,5vw,56px);max-width:780px;width:100%;text-align:center}.sprinkle{position:absolute;font-size:26px;animation:float 4s ease-in-out infinite;opacity:.9}.s1{top:16px;left:24px}.s2{top:18px;right:24px;animation-delay:1s}.s3{bottom:20px;left:18px;animation-delay:2s}.s4{bottom:18px;right:18px;animation-delay:.5s}h1{font-size:clamp(2.8rem,9vw,5.7rem);line-height:1.04;margin:12px 0;color:#e33282;letter-spacing:-.05em}h2{font-size:clamp(1.35rem,4vw,2.2rem);margin:8px 0 22px;color:#6240a2}.pill{display:inline-block;background:#ffdc60;border-radius:99px;padding:9px 18px;font-weight:800;transform:rotate(-3deg)}p{font-size:clamp(1rem,2.5vw,1.23rem);line-height:1.55}.love{color:#a02d71;font-weight:750}.btn{background:linear-gradient(90deg,#ed368a,#fc8650);color:white;border:0;border-radius:99px;padding:16px 28px;font-weight:800;font-size:1.08rem;cursor:pointer;box-shadow:0 8px 20px #d54c8055}.btn:hover{transform:translateY(-2px)}input{width:min(100%,320px);padding:15px;border:2px solid #e8b2d3;border-radius:14px;font-size:1.1rem;margin:8px 0 16px}small{color:#795b77}.error{color:#a80043;font-weight:700}.hidden{display:none}.stars{font-size:2.3rem}.confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden}.piece{position:absolute;top:-20px;width:10px;height:17px;animation:fall linear forwards}@keyframes fall{to{transform:translateY(110vh) rotate(650deg)}}@keyframes float{50%{transform:translateY(-9px) rotate(8deg)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important}}
</style>`;
function page(inner){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Montse · ¡Felices 57!</title>${css}</head><body><main class="card"><span class="sprinkle s1">🎈</span><span class="sprinkle s2">🌼</span><span class="sprinkle s3">🎊</span><span class="sprinkle s4">💗</span>${inner}</main><div id="confetti" class="confetti" aria-hidden="true"></div></body></html>`}
const login = error => page(`<span class="pill">🎁 ¡Tenemos una sorpresa!</span><h1>¡Felices 57,<br>Montse!</h1><h2>La fiesta empieza aquí 🥳</h2><p>Hay 57 razones para celebrar… ¡y millones para quererte!</p><p>Esta aventura familiar tiene una llave secreta. 🔑</p><form method="post" action="/entrar"><label for="password"><b>Contraseña familiar</b></label><br><input id="password" type="password" name="password" autocomplete="current-password" required maxlength="200"><br><button class="btn" type="submit">¡Abrir mi regalo! 🎉</button></form>${error?'<p class="error" role="alert">Contraseña incorrecta. Inténtalo otra vez.</p>':''}<p><small>Con mucho cariño: Antonio, Raquel, Mar, Sofía y Mía 🐾</small></p>`);
const inside = page(`<span class="pill">🎉 ¡Sorpresa desbloqueada!</span><h1>¡Felices 57,<br>Montse!</h1><h2>31 años juntos… ¡y lo que nos queda! 💃</h2><div class="stars">🌸 🎂 💕 🐾 🌺</div><p>De las recetas que nos hacen felices a esos arreglos que solo tú sabes hacer. De nuestras risas a todos los recuerdos que seguimos construyendo.</p><p class="love">¡Te queremos muchísimo!</p><p>Antonio, Raquel, Mar, Sofía y Mía 🐾</p><button class="btn" onclick="celebrate()">¡Que llueva confeti! 🎊</button><p><small>Próximamente: nuestro álbum interactivo de recuerdos.</small></p><form method="post" action="/salir"><button type="submit" style="background:none;border:0;text-decoration:underline;cursor:pointer;color:#6240a2">Cerrar sesión</button></form><script>function celebrate(){const c=document.getElementById('confetti');c.innerHTML='';for(let i=0;i<100;i++){let x=document.createElement('i');x.className='piece';x.style.left=Math.random()*100+'%';x.style.background=['#ef3b91','#ffd342','#54cdb5','#8861c7'][i%4];x.style.animationDuration=2+Math.random()*3+'s';x.style.animationDelay=Math.random()*.8+'s';c.appendChild(x)}setTimeout(()=>c.innerHTML='',6500)}celebrate()</script>`);
function respond(body,status=200,extra={}) {return {statusCode:status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",...extra},body}}
exports.handler=async event=>{
  if(!secret||!password||secret.length<32) return respond('<h1>Configuración pendiente</h1><p>Define FAMILY_PASSWORD y SESSION_SECRET en Netlify.</p>',503);
  const path = event.path || '/';
  if(event.httpMethod==='POST' && path==='/entrar') {
    const data = new URLSearchParams(event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'');
    const input=data.get('password')||'';
    const a=crypto.createHash('sha256').update(input).digest();const b=crypto.createHash('sha256').update(password).digest();
    if(!crypto.timingSafeEqual(a,b))return respond(login(true),401);
    const exp=String(Math.floor(Date.now()/1000)+DAYS);
    return {statusCode:303,headers:{Location:'/', 'Set-Cookie':`montse_session=${exp}.${sign(exp)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DAYS}`, 'Cache-Control':'no-store'}};
  }
  if(event.httpMethod==='POST' && path==='/salir')return {statusCode:303,headers:{Location:'/', 'Set-Cookie':'montse_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0','Cache-Control':'no-store'}};
  if(event.httpMethod!=='GET')return respond('Método no permitido',405);
  return respond(authenticated(event.headers||{})?inside:login(false));
};
