const crypto = require('node:crypto');
const {getStore, connectLambda} = require('@netlify/blobs');
const DAYS = 7 * 24 * 60 * 60;
const secret = process.env.SESSION_SECRET;
const password = process.env.ALBUM_PASSWORD;
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Sesiones opacas guardadas en Netlify Blobs: permiten revocacion inmediata.
const sessionKey = token => crypto.createHmac('sha256',secret).update(token).digest('hex');
const safeEqual = (a,b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(),crypto.createHash('sha256').update(b).digest());
const now = () => Math.floor(Date.now()/1000);
function cookieToken(headers={}) {
  const found = (headers.cookie || headers.Cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('montse_session='));
  const token = found?.slice('montse_session='.length);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
function stores(event) {
  connectLambda(event);
  return {sessions:getStore('montse-sesiones-v3')};
}
async function authenticated(event) {
  const token=cookieToken(event.headers);
  if(!token) return false;
  const {sessions}=stores(event);
  const entry=await sessions.get(sessionKey(token),{type:'json'});
  return !!(entry && Number.isFinite(entry.expires) && entry.expires>now());
}
function crossSite(event) {
  const h=event.headers||{};
  // Los navegadores modernos identifican directamente el contexto de la petición.
  // Esto evita comparar el Host interno de la funcion con el dominio publico del Deploy Preview.
  const site=(h['sec-fetch-site']||h['Sec-Fetch-Site']||'').toLowerCase();
  if(site==='cross-site') return true;
  if(site==='same-origin') return false;
  // Si falta la cabecera Fetch Metadata, comprobamos Origin contra los dominios
  // de despliegue declarados por Netlify. Nunca aceptamos un origen arbitrario.
  const origin=h.origin||h.Origin;
  if(!origin) return false; // Algunos formularios no envian Origin.
  try {
    const url=new URL(origin);
    if(url.protocol!=='https:') return true;
    const candidates=[process.env.DEPLOY_PRIME_URL,process.env.DEPLOY_URL,process.env.URL]
      .filter(Boolean).map(value=>new URL(value).origin.toLowerCase());
    // Cuando Netlify suministra un dominio de despliegue, solo ese dominio
    // puede enviar formularios en navegadores sin Fetch Metadata.
    return !candidates.includes(url.origin.toLowerCase());
  } catch {return true;}
}
const css = `<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#38233f}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 8% 15%,#ffe16c,transparent 30%),radial-gradient(circle at 92% 25%,#ffa8b8,transparent 35%),linear-gradient(130deg,#ffdd91,#ffb5c6 48%,#c8f6e9);display:grid;place-items:center;padding:20px}.card{position:relative;overflow:hidden;background:rgba(255,255,255,.91);border:4px solid white;border-radius:28px;box-shadow:0 20px 65px #9d477b42;padding:clamp(24px,5vw,56px);max-width:780px;width:100%;text-align:center}.sprinkle{position:absolute;font-size:26px;animation:float 4s ease-in-out infinite;opacity:.9}.s1{top:16px;left:24px}.s2{top:18px;right:24px;animation-delay:1s}.s3{bottom:20px;left:18px;animation-delay:2s}.s4{bottom:18px;right:18px;animation-delay:.5s}h1{font-size:clamp(2.8rem,9vw,5.7rem);line-height:1.04;margin:12px 0;color:#e33282;letter-spacing:-.05em}h2{font-size:clamp(1.35rem,4vw,2.2rem);margin:8px 0 22px;color:#6240a2}.pill{display:inline-block;background:#ffdc60;border-radius:99px;padding:9px 18px;font-weight:800;transform:rotate(-3deg)}p{font-size:clamp(1rem,2.5vw,1.23rem);line-height:1.55}.love{color:#a02d71;font-weight:750}.btn{background:linear-gradient(90deg,#ed368a,#fc8650);color:white;border:0;border-radius:99px;padding:16px 28px;font-weight:800;font-size:1.08rem;cursor:pointer;box-shadow:0 8px 20px #d54c8055}.btn:hover{transform:translateY(-2px)}input{width:min(100%,320px);padding:15px;border:2px solid #e8b2d3;border-radius:14px;font-size:1.1rem;margin:8px 0 16px}small{color:#795b77}.error{color:#a80043;font-weight:700}.hidden{display:none}.stars{font-size:2.3rem}.confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden}.piece{position:absolute;top:-20px;width:10px;height:17px;animation:fall linear forwards}@keyframes fall{to{transform:translateY(110vh) rotate(650deg)}}@keyframes float{50%{transform:translateY(-9px) rotate(8deg)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important}}
</style>`;
function page(inner){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Montse · ¡Felices 57!</title>${css}</head><body><main class="card"><span class="sprinkle s1">🎈</span><span class="sprinkle s2">🌼</span><span class="sprinkle s3">🎊</span><span class="sprinkle s4">💗</span>${inner}</main><div id="confetti" class="confetti" aria-hidden="true"></div></body></html>`}
const login = error => page(`<span class="pill">🎁 ¡Tenemos una sorpresa!</span><h1>¡Felices 57,<br>Montse!</h1><h2>La fiesta empieza aquí 🥳</h2><p>Hay 57 razones para celebrar… ¡y millones para quererte!</p><p>Esta aventura familiar tiene una llave secreta. 🔑</p><form method="post" action="/entrar"><label for="password"><b>Contraseña familiar</b></label><br><input id="password" type="password" name="password" autocomplete="current-password" required maxlength="200"><br><button class="btn" type="submit">¡Abrir mi regalo! 🎉</button></form>${error?'<p class="error" role="alert">Contraseña incorrecta. Inténtalo otra vez.</p>':''}<p><small>Con mucho cariño: Antonio, Raquel, Mar, Sofía y Mía 🐾</small></p>`);
// Prototipo V2 servido exclusivamente despues de autenticar la sesion.
const bookHtmlBase64 = 'PCFkb2N0eXBlIGh0bWw+PGh0bWwgbGFuZz0iZXMiPjxoZWFkPjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij48bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLGluaXRpYWwtc2NhbGU9MSI+PHRpdGxlPk1vbnRzZSDCtyBQcm90b3RpcG8gZGUgw6FsYnVtPC90aXRsZT48c3R5bGU+Cjpyb290e2ZvbnQtZmFtaWx5Okdlb3JnaWEsJ1RpbWVzIE5ldyBSb21hbicsc2VyaWY7Y29sb3I6IzU1M2U0MjtiYWNrZ3JvdW5kOiNlZmU0ZDd9Kntib3gtc2l6aW5nOmJvcmRlci1ib3h9Ym9keXttYXJnaW46MDttaW4taGVpZ2h0OjEwMHZoO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSBhdCAyMCUgMTAlLCNmZmY4ZWYsdHJhbnNwYXJlbnQgNDUlKSxsaW5lYXItZ3JhZGllbnQoMTQ1ZGVnLCNlNmQzYzUsI2Y5ZWVlNCk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoyNHB4IDEycHh9aGVhZGVye3RleHQtYWxpZ246Y2VudGVyfWhlYWRlciBzbWFsbHtsZXR0ZXItc3BhY2luZzouMjRlbTtjb2xvcjojYTE3YzczO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtmb250OjEycHggc3lzdGVtLXVpfWgxe2ZvbnQtc2l6ZTpjbGFtcCgyNnB4LDR2dyw0MnB4KTttYXJnaW46OHB4IDA7Y29sb3I6IzcwNDY1Yn1oZWFkZXIgcHttYXJnaW46MCAwIDE4cHg7Zm9udC1zdHlsZTppdGFsaWN9LnRvb2xiYXJ7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206MThweDtmb250OjE0cHggc3lzdGVtLXVpfXNlbGVjdCxidXR0b257Ym9yZGVyOjFweCBzb2xpZCAjYzZhNmExO2JvcmRlci1yYWRpdXM6MjJweDtiYWNrZ3JvdW5kOiNmZmZhZjQ7Y29sb3I6IzY5NDQ1NjtwYWRkaW5nOjEwcHggMTVweDtjdXJzb3I6cG9pbnRlcjtmb250OmluaGVyaXR9YnV0dG9uOmRpc2FibGVke29wYWNpdHk6LjM1O2N1cnNvcjpub3QtYWxsb3dlZH1idXR0b246aG92ZXI6bm90KDpkaXNhYmxlZCl7YmFja2dyb3VuZDojZjRlMGQ5fS5ib29re3dpZHRoOm1pbig5ODBweCw5NnZ3KTtoZWlnaHQ6bWluKDU5MHB4LDY1dncpO21pbi1oZWlnaHQ6MzgwcHg7cG9zaXRpb246cmVsYXRpdmU7cGVyc3BlY3RpdmU6MTgwMHB4O2ZpbHRlcjpkcm9wLXNoYWRvdygwIDIwcHggMjBweCAjNmE0MzQzMzYpfS5zcHJlYWR7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Ym9yZGVyLXJhZGl1czo4cHggMTZweCAxNnB4IDhweDtvdmVyZmxvdzpoaWRkZW47YmFja2dyb3VuZDojZmZmY2Y0O2JveC1zaGFkb3c6aW5zZXQgMCAwIDAgMXB4ICNlNmQ1Yzd9LnBhZ2V7cG9zaXRpb246cmVsYXRpdmU7cGFkZGluZzpjbGFtcCgxOHB4LDN2dyw0MnB4KTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCg5MGRlZywjZjlmMWU2LCNmZmZjZjUgMTUlLCNmZmZkZjggOTAlLCNmNmU5ZGIpO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7dGV4dC1hbGlnbjpjZW50ZXI7b3ZlcmZsb3c6aGlkZGVufS5wYWdlLnJpZ2h0e2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDkwZGVnLCNlZWUwZDEsI2ZmZmFmMiAxMCUsI2ZmZmNmNiA4OCUsI2Y3ZWFkZil9LnBhZ2UubGVmdDphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7dG9wOjA7Ym90dG9tOjA7d2lkdGg6MTZweDtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCg5MGRlZyx0cmFuc3BhcmVudCwjNmQ0YTNkMjApfS5wYWdlLnJpZ2h0OmJlZm9yZXtjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6MDtib3R0b206MDt3aWR0aDoxNnB4O2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDkwZGVnLCM2ZDRhM2QyMCx0cmFuc3BhcmVudCl9LnBob3Rve3dpZHRoOjEwMCU7bWF4LWhlaWdodDo3MiU7YXNwZWN0LXJhdGlvOjQvMztib3JkZXI6OXB4IHNvbGlkIHdoaXRlO2JveC1zaGFkb3c6MCA4cHggMjJweCAjNjU0ODNiNDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQ6Y2xhbXAoMzhweCw3dncsODRweCkgc3lzdGVtLXVpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDEzNWRlZyx2YXIoLS1jMSksdmFyKC0tYzIpKTt0cmFuc2Zvcm06cm90YXRlKHZhcigtLXRpbHQpKTt9LmNhcHRpb257Zm9udC1zdHlsZTppdGFsaWM7bWFyZ2luLXRvcDoyMnB4O2ZvbnQtc2l6ZTpjbGFtcCgxNXB4LDJ2dywyM3B4KX0uY2hhcHRlci1sYWJlbHtmb250OjEycHggc3lzdGVtLXVpO2xldHRlci1zcGFjaW5nOi4xOGVtO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtjb2xvcjojYTE3YzczfS5xdW90ZXtmb250LXNpemU6Y2xhbXAoMjNweCwzLjN2dyw0M3B4KTtsaW5lLWhlaWdodDoxLjM7Y29sb3I6IzhiNTM2Y30ub3JuYW1lbnR7Y29sb3I6I2M4OWE3Zjtmb250LXNpemU6MzRweDttYXJnaW46MTZweH0ubnVtYmVye3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbToxMnB4O2ZvbnQ6MTJweCBzeXN0ZW0tdWk7Y29sb3I6I2FhOGU4MX0uZmxpcHBlcntwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtib3R0b206MDtsZWZ0OjUwJTt3aWR0aDo1MCU7dHJhbnNmb3JtLW9yaWdpbjpsZWZ0IGNlbnRlcjt0cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7cG9pbnRlci1ldmVudHM6bm9uZTt6LWluZGV4OjQ7ZGlzcGxheTpub25lfS5mbGlwcGVyLmFjdGl2ZXtkaXNwbGF5OmJsb2NrO2FuaW1hdGlvbjp0dXJuIC43OHMgZWFzZS1pbi1vdXQgZm9yd2FyZHN9LmZsaXBwZXIucmV2ZXJzZXtsZWZ0OjA7dHJhbnNmb3JtLW9yaWdpbjpyaWdodCBjZW50ZXI7YW5pbWF0aW9uLW5hbWU6dHVybmJhY2t9LmZsaXBwZXIucmV2ZXJzZSAuZnJvbnR7dHJhbnNmb3JtOnJvdGF0ZVkoMCl9LmZsaXBwZXIucmV2ZXJzZSAuYmFja3t0cmFuc2Zvcm06cm90YXRlWSgxODBkZWcpfUBrZXlmcmFtZXMgdHVybmJhY2t7ZnJvbXt0cmFuc2Zvcm06cm90YXRlWSgwKX10b3t0cmFuc2Zvcm06cm90YXRlWSgxODBkZWcpfX0uZmFjZXtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2JhY2tmYWNlLXZpc2liaWxpdHk6aGlkZGVuO292ZXJmbG93OmhpZGRlbn0uZmFjZS5iYWNre3RyYW5zZm9ybTpyb3RhdGVZKDE4MGRlZyl9QGtleWZyYW1lcyB0dXJue2Zyb217dHJhbnNmb3JtOnJvdGF0ZVkoMCl9dG97dHJhbnNmb3JtOnJvdGF0ZVkoLTE4MGRlZyl9fS5zdGF0dXN7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udDoxM3B4IHN5c3RlbS11aTtjb2xvcjojN2Q2MjVmO21hcmdpbi10b3A6MTdweH0ubm90ZXttYXgtd2lkdGg6NzIwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udDoxM3B4LzEuNiBzeXN0ZW0tdWk7Y29sb3I6IzgzNmU2OTttYXJnaW46MTZweCBhdXRvfWJvZHkucmVkdWNlZCAuZmxpcHBlci5hY3RpdmV7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMXN9QG1lZGlhKG1heC13aWR0aDo2NTBweCl7Ym9keXtwYWRkaW5nOjE4cHggNnB4fS5ib29re3dpZHRoOm1pbig0MjBweCw5NHZ3KTtoZWlnaHQ6NTIwcHg7bWluLWhlaWdodDowfS5zcHJlYWR7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmcn0ucGFnZS5sZWZ0e2Rpc3BsYXk6bm9uZX0ucGFnZS5yaWdodDpiZWZvcmV7ZGlzcGxheTpub25lfS5wYWdle3BhZGRpbmc6MjVweH0ucGhvdG97bWF4LWhlaWdodDo2NSU7Zm9udC1zaXplOjY0cHh9LmZsaXBwZXJ7bGVmdDowO3dpZHRoOjEwMCV9LnF1b3Rle2ZvbnQtc2l6ZTozMXB4fX0KCi5yZWFkaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0uZXhpdC1yZWFkaW5ne2Rpc3BsYXk6bm9uZX0ucmVhZGluZy5mb2N1c2Vke3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMDA7YmFja2dyb3VuZDpyYWRpYWwtZ3JhZGllbnQoY2lyY2xlIGF0IGNlbnRlciwjZmZmN2VjLCNkOWM0YjkpO3BhZGRpbmc6NjRweCAxNHB4IDI0cHh9LnJlYWRpbmcuZm9jdXNlZCAuYm9va3t3aWR0aDptaW4oMTQwMHB4LDk2dncpO2hlaWdodDptaW4oNzYwcHgsY2FsYygxMDBkdmggLSAxMTJweCkpO21pbi1oZWlnaHQ6MH0ucmVhZGluZy5mb2N1c2VkIC5leGl0LXJlYWRpbmd7ZGlzcGxheTpibG9jaztwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxOHB4O3otaW5kZXg6MTEwO2JhY2tncm91bmQ6I2ZmZmFmNDtib3gtc2hhZG93OjAgM3B4IDEycHggIzY1NDgzYjMzfS5ib29re3RvdWNoLWFjdGlvbjpwYW4teTt1c2VyLXNlbGVjdDpub25lfS5ib29rOmFmdGVye2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lfS5yZWFkaW5nLmZvY3VzZWQgLmJvb2t7ZmlsdGVyOmRyb3Atc2hhZG93KDAgMTVweCAyMHB4ICM2YTQzNDM0NCl9CkBtZWRpYShtYXgtd2lkdGg6NjUwcHgpey5yZWFkaW5nLmZvY3VzZWR7cGFkZGluZzo2MnB4IDEwcHggMTJweH0ucmVhZGluZy5mb2N1c2VkIC5ib29re3dpZHRoOm1pbig5NXZ3LDUyMHB4KTtoZWlnaHQ6Y2FsYygxMDBkdmggLSA5MHB4KTttYXgtaGVpZ2h0Ojc4MHB4fS5yZWFkaW5nLmZvY3VzZWQgLnBhZ2V7cGFkZGluZzoyMHB4fS5yZWFkaW5nLmZvY3VzZWQgLmNhcHRpb257bWFyZ2luLXRvcDoxMnB4fX0KCi8qIEN1YmllcnRhczogdW4gw7puaWNvIHBhbmVsIGNlbnRyYWRvLCBzaW4gcGxpZWd1ZSBjZW50cmFsLiAqLwouc3ByZWFkLnNpbmdsZS1jb3ZlcntkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1pdGVtczpzdHJldGNoO2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzpub25lO292ZXJmbG93OnZpc2libGV9Ci5zcHJlYWQuc2luZ2xlLWNvdmVyIC5jb3Zlci1wYWdle3dpZHRoOjUwJTtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjdweCAxN3B4IDE3cHggN3B4O2JvcmRlcjoxcHggc29saWQgI2I5OWE4ZDtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMTBkZWcsI2VhZDZjYSwjZmZmOWYwIDEzJSwjZjhlOGRjIDk1JSk7Ym94LXNoYWRvdzo4cHggMTJweCAyM3B4ICM2NTQ4M2I0NCxpbnNldCA5cHggMCAxNHB4ICM4NTVlNGQyNDtwYWRkaW5nOmNsYW1wKDE2cHgsM3Z3LDM2cHgpfQouc3ByZWFkLnNpbmdsZS1jb3ZlciAuY292ZXItcGFnZTpiZWZvcmUsLnNwcmVhZC5zaW5nbGUtY292ZXIgLmNvdmVyLXBhZ2U6YWZ0ZXJ7ZGlzcGxheTpub25lfQpAbWVkaWEobWF4LXdpZHRoOjY1MHB4KXsuc3ByZWFkLnNpbmdsZS1jb3ZlciAuY292ZXItcGFnZXt3aWR0aDoxMDAlO21heC13aWR0aDoxMDAlfX0KPC9zdHlsZT48L2hlYWQ+PGJvZHk+PGhlYWRlcj48c21hbGw+VW4gcmVnYWxvIGhlY2hvIGRlIHJlY3VlcmRvczwvc21hbGw+PGgxPk1vbnRzZSDCtyA1NyBhw7FvczwvaDE+PHA+MzEgYcOxb3MganVudG9z4oCmIHkgdG9kYXMgbGFzIHDDoWdpbmFzIHF1ZSBub3MgcXVlZGFuPC9wPjwvaGVhZGVyPjxkaXYgY2xhc3M9InRvb2xiYXIiPjxsYWJlbCBmb3I9ImNoYXB0ZXIiPkNhcMOtdHVsbzo8L2xhYmVsPjxzZWxlY3QgaWQ9ImNoYXB0ZXIiPjwvc2VsZWN0PjxidXR0b24gaWQ9InByZXYiIGFyaWEtbGFiZWw9IlDDoWdpbmEgYW50ZXJpb3IiPuKGkCBBbnRlcmlvcjwvYnV0dG9uPjxidXR0b24gaWQ9Im5leHQiIGFyaWEtbGFiZWw9IlDDoWdpbmEgc2lndWllbnRlIj5TaWd1aWVudGUg4oaSPC9idXR0b24+PGJ1dHRvbiBpZD0iZm9jdXMiIGFyaWEtbGFiZWw9IkFtcGxpYXIgbGlicm8iPuKbtiBWZXIgc29sbyBlbCBsaWJybzwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9InJlYWRpbmciIGlkPSJyZWFkaW5nIj48YnV0dG9uIGNsYXNzPSJleGl0LXJlYWRpbmciIGlkPSJleGl0IiBhcmlhLWxhYmVsPSJWb2x2ZXIgYSBsb3MgY2Fww610dWxvcyI+4pyVIFZvbHZlciBhIGNhcMOtdHVsb3M8L2J1dHRvbj48ZGl2IGNsYXNzPSJib29rIiBhcmlhLWxhYmVsPSJMaWJybyBkZSByZWN1ZXJkb3MiPjxkaXYgY2xhc3M9InNwcmVhZCIgaWQ9InNwcmVhZCI+PC9kaXY+PGRpdiBjbGFzcz0iZmxpcHBlciIgaWQ9ImZsaXBwZXIiPjxkaXYgY2xhc3M9ImZhY2UgZnJvbnQiIGlkPSJmcm9udCI+PC9kaXY+PGRpdiBjbGFzcz0iZmFjZSBiYWNrIiBpZD0iYmFjayI+PC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ic3RhdHVzIiBpZD0ic3RhdHVzIiBhcmlhLWxpdmU9InBvbGl0ZSI+PC9kaXY+PHAgY2xhc3M9Im5vdGUiPlByb3RvdGlwbyBkZSBkaXNlw7FvOiBsYXMgaW3DoWdlbmVzIHNvbiBtYXJjYWRvcmVzIGlsdXN0cmF0aXZvcywgbm8gZm90b2dyYWbDrWFzIGZhbWlsaWFyZXMuIEZ1bmNpb25hIHNpbiBjb25leGnDs24gYSBJbnRlcm5ldC4gUHVlZGVzIHVzYXIgbGFzIGZsZWNoYXMgZGVsIHRlY2xhZG8sIHRvY2FyIGxvcyBsYWRvcyBkZWwgbGlicm8gbyBkZXNsaXphciBjb24gZWwgZGVkbyBlbiBlbCBpUGFkIHkgZWwgbcOzdmlsLiBFbCBib3TDs24gwqtWZXIgc29sbyBlbCBsaWJyb8K7IGFtcGzDrWEgbGEgbGVjdHVyYS48L3A+PHNjcmlwdD4KY29uc3QgY2hhcHRlcnM9W3t0aXRsZTonQXPDrSBlbXBlesOzIHRvZG8nLGljb246J/CfkownLGNvbG9yczpbJyNmNWQ5YzQnLCcjZThhOWE4J10sY2FwdGlvbnM6WydEb25kZSBjb21lbnrDsyBudWVzdHJhIGhpc3RvcmlhJywnQXF1ZWxsb3MgcHJpbWVyb3MgcmVjdWVyZG9zJywnWSBzdXBpbW9zIHF1ZSBlcmEgcGFyYSBzaWVtcHJlJ119LHt0aXRsZTonQ29uc3RydXllbmRvIG51ZXN0cmEgdmlkYScsaWNvbjon8J+PoScsY29sb3JzOlsnI2NkZTFkNCcsJyM5ZmJlYjInXSxjYXB0aW9uczpbJ051ZXN0cm8gcHJpbWVyIGhvZ2FyJywnTG9zIHN1ZcOxb3MgY29tcGFydGlkb3MnLCdUb2RvIGxvIHF1ZSBmdWltb3MgY29uc3RydXllbmRvJ119LHt0aXRsZTonTnVlc3RybyBtYXlvciByZWdhbG8nLGljb246J/CfkpUnLGNvbG9yczpbJyNmOGQ1ZGInLCcjZGJhOGI5J10sY2FwdGlvbnM6WydSYXF1ZWwsIE1hciB5IFNvZsOtYScsJ051ZXN0cmEgZmFtaWxpYSwgbnVlc3RyYSBhbGVncsOtYScsJ01vbWVudG9zIHF1ZSBubyBzZSBvbHZpZGFuJ119LHt0aXRsZTonTG9zIGx1Z2FyZXMgcXVlIHZpdmltb3MnLGljb246J/CfjIUnLGNvbG9yczpbJyNjNGQ5ZTgnLCcjZWFjOGE0J10sY2FwdGlvbnM6WydWaWFqZXMgcXVlIHJlY29yZGFyZW1vcyBzaWVtcHJlJywnQ2FkYSByaW5jw7NuIHRpZW5lIHVuYSBoaXN0b3JpYScsJ1kgbXVjaG9zIGRlc3Rpbm9zIHBvciBkZXNjdWJyaXInXX0se3RpdGxlOidMb3MgcGVxdWXDsW9zIG1vbWVudG9zJyxpY29uOifwn5C+Jyxjb2xvcnM6WycjZTZkN2M0JywnI2M3YjBhMSddLGNhcHRpb25zOlsnTGEgZmVsaWNpZGFkIGRlIGNhZGEgZMOtYScsJ1Jpc2FzLCByZXVuaW9uZXMgeSBNw61hJywnTGFzIGNvc2FzIHF1ZSBtw6FzIGltcG9ydGFuJ119LHt0aXRsZTonTG8gbWVqb3IgZXN0w6EgcG9yIHZlbmlyJyxpY29uOifwn4y5Jyxjb2xvcnM6WycjZjBjN2QzJywnI2Q1YjVkNSddLGNhcHRpb25zOlsnVG9kYXbDrWEgcXVlZGFuIHRhbnRhcyBhdmVudHVyYXMnLCczMSBhw7FvcyBqdW50b3MnLCdZIGxvIG1lam9yIGVzdMOhIHBvciB2ZW5pciddfV07CmNvbnN0IHNwcmVhZHM9W3tjaTowLGtpbmQ6J2NvdmVyJ31dO2NoYXB0ZXJzLmZvckVhY2goKGNoLGNpKT0+e3NwcmVhZHMucHVzaCh7Y2ksa2luZDonaW50cm8nfSk7Zm9yKGxldCBpPTA7aTwzO2krKylzcHJlYWRzLnB1c2goe2NpLGtpbmQ6J3Bob3RvcycsaX0pfSk7c3ByZWFkcy5wdXNoKHtjaTpjaGFwdGVycy5sZW5ndGgtMSxraW5kOidiYWNrY292ZXInfSk7bGV0IGN1cnJlbnQ9MCxidXN5PWZhbHNlO2NvbnN0ICQ9aWQ9PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtbe3ZhbHVlOidjb3ZlcicsbGFiZWw6J1BvcnRhZGEnfSwuLi5jaGFwdGVycy5tYXAoKGNoLGkpPT4oe3ZhbHVlOlN0cmluZyhpKSxsYWJlbDooaSsxKSsnLiAnK2NoLnRpdGxlfSkpLHt2YWx1ZTonYmFja2NvdmVyJyxsYWJlbDonQ29udHJhcG9ydGFkYSd9XS5mb3JFYWNoKGl0ZW09Pntjb25zdCBvPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO28udmFsdWU9aXRlbS52YWx1ZTtvLnRleHRDb250ZW50PWl0ZW0ubGFiZWw7JCgnY2hhcHRlcicpLmFwcGVuZENoaWxkKG8pfSk7ZnVuY3Rpb24gcGhvdG8oY2gsaSl7cmV0dXJuIGA8ZGl2IGNsYXNzPSJwaG90byIgc3R5bGU9Ii0tYzE6JHtjaC5jb2xvcnNbMF19Oy0tYzI6JHtjaC5jb2xvcnNbMV19Oy0tdGlsdDoke2klMj8nMmRlZyc6Jy0yZGVnJ30iIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iRXNwYWNpbyByZXNlcnZhZG8gcGFyYSBmb3RvZ3JhZsOtYSI+JHtjaC5pY29ufTwvZGl2PmB9ZnVuY3Rpb24gcGFnZShzLHNpZGUpe2NvbnN0IGNoPWNoYXB0ZXJzW3MuY2ldLG49c3ByZWFkcy5pbmRleE9mKHMpKzE7aWYocy5raW5kPT09J2NvdmVyJylyZXR1cm4gc2lkZT09PSdsZWZ0Jz8nPGRpdiBjbGFzcz0iY2hhcHRlci1sYWJlbCI+VW4gbGlicm8gcGFyYSB0aTwvZGl2PjxkaXYgY2xhc3M9Im9ybmFtZW50Ij7inaY8L2Rpdj4nOic8ZGl2IGNsYXNzPSJjaGFwdGVyLWxhYmVsIj5OdWVzdHJhIGhpc3RvcmlhPC9kaXY+PGRpdiBjbGFzcz0ib3JuYW1lbnQiPuKZpTwvZGl2PjxkaXYgY2xhc3M9InF1b3RlIj5Nb250c2UgwrcgNTcgYcOxb3M8L2Rpdj48ZGl2IGNsYXNzPSJjYXB0aW9uIj4zMSBhw7FvcyBqdW50b3PigKYgeSB0b2RhcyBsYXMgcMOhZ2luYXMgcXVlIG5vcyBxdWVkYW48L2Rpdj4nO2lmKHMua2luZD09PSdiYWNrY292ZXInKXJldHVybiBzaWRlPT09J2xlZnQnPyc8ZGl2IGNsYXNzPSJxdW90ZSI+TG8gbWVqb3IgZXN0w6EgcG9yIHZlbmlyPC9kaXY+PGRpdiBjbGFzcz0ib3JuYW1lbnQiPuKZpTwvZGl2Pic6JzxkaXYgY2xhc3M9ImNoYXB0ZXItbGFiZWwiPkNvbiB0b2RvIG51ZXN0cm8gY2FyacOxbzwvZGl2PjxkaXYgY2xhc3M9InF1b3RlIj5TaWVtcHJlIGp1bnRvczwvZGl2PjxkaXYgY2xhc3M9ImNhcHRpb24iPkFudG9uaW8sIFJhcXVlbCwgTWFyLCBTb2bDrWEgeSBNw61hIPCfkL48L2Rpdj4nO2lmKHMua2luZD09PSdpbnRybycpe3JldHVybiBzaWRlPT09J2xlZnQnP2A8ZGl2IGNsYXNzPSJjaGFwdGVyLWxhYmVsIj5DYXDDrXR1bG8gJHtzLmNpKzF9PC9kaXY+PGRpdiBjbGFzcz0ib3JuYW1lbnQiPuKdpjwvZGl2PjxkaXYgY2xhc3M9InF1b3RlIj4ke2NoLnRpdGxlfTwvZGl2PjxkaXYgY2xhc3M9Im9ybmFtZW50Ij7inKc8L2Rpdj5gOmAke3Bob3RvKGNoLDApfTxkaXYgY2xhc3M9ImNhcHRpb24iPlVuYSBoaXN0b3JpYSBxdWUgbWVyZWNlIGNvbnRhcnNlPC9kaXY+YH1yZXR1cm4gc2lkZT09PSdsZWZ0Jz9gJHtwaG90byhjaCxzLmkpfTxkaXYgY2xhc3M9ImNhcHRpb24iPiR7Y2guY2FwdGlvbnNbcy5pXX08L2Rpdj5gOmA8ZGl2IGNsYXNzPSJjaGFwdGVyLWxhYmVsIj5OdWVzdHJvcyByZWN1ZXJkb3M8L2Rpdj48ZGl2IGNsYXNzPSJvcm5hbWVudCI+4p2mPC9kaXY+PGRpdiBjbGFzcz0icXVvdGUiPkNhZGEgZm90b2dyYWbDrWEgZ3VhcmRhIHVuIGluc3RhbnRlLiBKdW50YXMgY3VlbnRhbiBudWVzdHJhIHZpZGEuPC9kaXY+PGRpdiBjbGFzcz0ibnVtYmVyIj4ke259PC9kaXY+YH1mdW5jdGlvbiByZW5kZXIoKXtjb25zdCBzPXNwcmVhZHNbY3VycmVudF07Y29uc3Qgc2luZ2xlPXMua2luZD09PSdjb3Zlcid8fHMua2luZD09PSdiYWNrY292ZXInOyQoJ3NwcmVhZCcpLmNsYXNzTGlzdC50b2dnbGUoJ3NpbmdsZS1jb3Zlcicsc2luZ2xlKTskKCdzcHJlYWQnKS5pbm5lckhUTUw9c2luZ2xlP2A8ZGl2IGNsYXNzPSJwYWdlIGNvdmVyLXBhZ2UiPiR7cGFnZShzLHMua2luZD09PSdjb3Zlcic/J3JpZ2h0JzonbGVmdCcpfTwvZGl2PmA6YDxkaXYgY2xhc3M9InBhZ2UgbGVmdCI+JHtwYWdlKHMsJ2xlZnQnKX08L2Rpdj48ZGl2IGNsYXNzPSJwYWdlIHJpZ2h0Ij4ke3BhZ2UocywncmlnaHQnKX08L2Rpdj5gOyQoJ2NoYXB0ZXInKS52YWx1ZT1zLmtpbmQ9PT0nY292ZXInPydjb3Zlcic6cy5raW5kPT09J2JhY2tjb3Zlcic/J2JhY2tjb3Zlcic6U3RyaW5nKHMuY2kpOyQoJ3N0YXR1cycpLnRleHRDb250ZW50PXMua2luZD09PSdjb3Zlcic/J1BvcnRhZGEnOnMua2luZD09PSdiYWNrY292ZXInPydDb250cmFwb3J0YWRhJzpgJHtjaGFwdGVyc1tzLmNpXS50aXRsZX0gwrcgUMOhZ2luYSAke2N1cnJlbnR9IGRlICR7c3ByZWFkcy5sZW5ndGgtMn1gOyQoJ3ByZXYnKS5kaXNhYmxlZD1jdXJyZW50PT09MDskKCduZXh0JykuZGlzYWJsZWQ9Y3VycmVudD09PXNwcmVhZHMubGVuZ3RoLTF9ZnVuY3Rpb24gZ28oZGVsdGEpe2lmKGRlbHRhPT09MHx8YnVzeXx8Y3VycmVudCtkZWx0YTwwfHxjdXJyZW50K2RlbHRhPj1zcHJlYWRzLmxlbmd0aClyZXR1cm47YnVzeT10cnVlO2NvbnN0IG9sZD1zcHJlYWRzW2N1cnJlbnRdLG5leHQ9c3ByZWFkc1tjdXJyZW50K2RlbHRhXTskKCdmcm9udCcpLmNsYXNzTmFtZT0nZmFjZSBmcm9udCBwYWdlICcrKGRlbHRhPDA/J2xlZnQnOidyaWdodCcpOyQoJ2JhY2snKS5jbGFzc05hbWU9J2ZhY2UgYmFjayBwYWdlICcrKGRlbHRhPDA/J3JpZ2h0JzonbGVmdCcpOyQoJ2Zyb250JykuaW5uZXJIVE1MPXBhZ2Uob2xkLGRlbHRhPDA/J2xlZnQnOidyaWdodCcpOyQoJ2JhY2snKS5pbm5lckhUTUw9cGFnZShuZXh0LGRlbHRhPDA/J3JpZ2h0JzonbGVmdCcpO2NvbnN0IGNvdmVyVHJhbnNpdGlvbj1vbGQua2luZD09PSdjb3Zlcid8fG9sZC5raW5kPT09J2JhY2tjb3Zlcid8fG5leHQua2luZD09PSdjb3Zlcid8fG5leHQua2luZD09PSdiYWNrY292ZXInOyQoJ2ZsaXBwZXInKS5jbGFzc0xpc3QudG9nZ2xlKCdyZXZlcnNlJyxkZWx0YTwwKTtpZighY292ZXJUcmFuc2l0aW9uKSQoJ2ZsaXBwZXInKS5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtzZXRUaW1lb3V0KCgpPT57Y3VycmVudCs9ZGVsdGE7cmVuZGVyKCk7JCgnZmxpcHBlcicpLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScsJ3JldmVyc2UnKTtidXN5PWZhbHNlfSwoY292ZXJUcmFuc2l0aW9ufHxtYXRjaE1lZGlhKCcocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKScpLm1hdGNoZXMpPzIwOjgwMCl9JCgnZm9jdXMnKS5vbmNsaWNrPSgpPT57ICQoJ3JlYWRpbmcnKS5jbGFzc0xpc3QuYWRkKCdmb2N1c2VkJyk7JCgnZXhpdCcpLmZvY3VzKCkgfTskKCdleGl0Jykub25jbGljaz0oKT0+eyQoJ3JlYWRpbmcnKS5jbGFzc0xpc3QucmVtb3ZlKCdmb2N1c2VkJyk7JCgnZm9jdXMnKS5mb2N1cygpfTskKCdzcHJlYWQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZT0+e2lmKGJ1c3l8fERhdGUubm93KCktbGFzdFN3aXBlPDY1MClyZXR1cm47Y29uc3Qgcj0kKCdzcHJlYWQnKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtnbyhlLmNsaWVudFgtci5sZWZ0PHIud2lkdGgqLjU/LTE6MSl9KTskKCduZXh0Jykub25jbGljaz0oKT0+Z28oMSk7JCgncHJldicpLm9uY2xpY2s9KCk9PmdvKC0xKTskKCdjaGFwdGVyJykub25jaGFuZ2U9ZT0+e2lmKGJ1c3kpcmV0dXJuO2NvbnN0IHY9ZS50YXJnZXQudmFsdWU7Y3VycmVudD12PT09J2NvdmVyJz8wOnY9PT0nYmFja2NvdmVyJz9zcHJlYWRzLmxlbmd0aC0xOnNwcmVhZHMuZmluZEluZGV4KHM9PnMuY2k9PT1OdW1iZXIodikmJnMua2luZD09PSdpbnRybycpO3JlbmRlcigpfTtkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyxlPT57aWYoZS50YXJnZXQudGFnTmFtZT09PSdTRUxFQ1QnKXJldHVybjtpZihlLmtleT09PSdBcnJvd1JpZ2h0JylnbygxKTtpZihlLmtleT09PSdBcnJvd0xlZnQnKWdvKC0xKTtpZihlLmtleT09PSdFc2NhcGUnJiYkKCdyZWFkaW5nJykuY2xhc3NMaXN0LmNvbnRhaW5zKCdmb2N1c2VkJykpJCgnZXhpdCcpLmNsaWNrKCl9KTtsZXQgdG91Y2hYPW51bGw7bGV0IGxhc3RTd2lwZT0wOyQoJ3NwcmVhZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLGU9Pnt0b3VjaFg9ZS5jaGFuZ2VkVG91Y2hlc1swXS5zY3JlZW5YfSx7cGFzc2l2ZTp0cnVlfSk7JCgnc3ByZWFkJykuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLGU9PntpZih0b3VjaFg9PT1udWxsKXJldHVybjtjb25zdCBkPWUuY2hhbmdlZFRvdWNoZXNbMF0uc2NyZWVuWC10b3VjaFg7aWYoTWF0aC5hYnMoZCk+NDUpe2xhc3RTd2lwZT1EYXRlLm5vdygpO2dvKGQ8MD8xOi0xKTt9dG91Y2hYPW51bGx9LHtwYXNzaXZlOnRydWV9KTtyZW5kZXIoKTsKPC9zY3JpcHQ+PC9ib2R5PjwvaHRtbD4K';
const inside = page(`<span class="pill">🎉 ¡Sorpresa desbloqueada!</span><h1>¡Felices 57,<br>Montse!</h1><h2>31 años juntos… ¡y lo que nos queda! 💃</h2><div class="stars">🌸 🎂 💕 🐾 🌺</div><p>De las recetas que nos hacen felices a esos arreglos que solo tú sabes hacer. De nuestras risas a todos los recuerdos que seguimos construyendo.</p><p class="love">¡Te queremos muchísimo!</p><p>Antonio, Raquel, Mar, Sofía y Mía 🐾</p><button class="btn" onclick="celebrate()">¡Que llueva confeti! 🎊</button><p><a href="/media/prueba.svg" target="_blank" rel="noopener">🔒 Abrir imagen privada de prueba</a></p><p><a class="btn" href="/album.html" style="display:inline-block;text-decoration:none">📖 Abrir nuestro álbum</a></p><form method="post" action="/salir"><button type="submit" style="background:none;border:0;text-decoration:underline;cursor:pointer;color:#6240a2">Cerrar sesión</button></form><script>function celebrate(){const c=document.getElementById('confetti');c.innerHTML='';for(let i=0;i<100;i++){let x=document.createElement('i');x.className='piece';x.style.left=Math.random()*100+'%';x.style.background=['#ef3b91','#ffd342','#54cdb5','#8861c7'][i%4];x.style.animationDuration=2+Math.random()*3+'s';x.style.animationDelay=Math.random()*.8+'s';c.appendChild(x)}setTimeout(()=>c.innerHTML='',6500)}celebrate()</script>`);
function respond(body,status=200,extra={}) {return {statusCode:status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",...extra},body}}

// Administracion V1: capitulos persistentes. El libro V4 permanece sin modificar.
const chapterStoreName='montse-album-config-v1';
const defaultChapters=['Así empezó todo','Construyendo nuestra vida','Nuestro mayor regalo','Los lugares que vivimos','Los pequeños momentos','Lo mejor está por venir'].map((title,i)=>({id:`cap-${i+1}`,title,intro:''}));
const adminPassword=process.env.ALBUM_ADMIN_PASSWORD;
const adminCookieName='montse_admin';
const adminLifetime=8*60*60;
function adminSignature(payload){return crypto.createHmac('sha256',secret).update('admin-v1:'+payload).digest('hex')}
function adminToken(event){
 const h=event.headers||{};
 const cookie=(h.cookie||h.Cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(adminCookieName+'='));
 return cookie?cookie.slice(adminCookieName.length+1):'';
}
function adminAuthenticated(event){
 const token=adminToken(event),match=/^([0-9]{10})\.([a-f0-9]{64})$/.exec(token);
 if(!match)return false;
 const expiry=Number(match[1]);
 return expiry>now() && expiry<=now()+adminLifetime && safeEqual(match[2],adminSignature(match[1]));
}
function adminCookie(expiry){const stamp=String(expiry);return `${adminCookieName}=${stamp}.${adminSignature(stamp)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${adminLifetime}`}
function adminResponse(data,status=200,extra={}){
 return {statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate, private','Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff',...extra},body:JSON.stringify(data)};
}
async function loadChapters(event){
 connectLambda(event);
 const saved=await getStore(chapterStoreName).get('chapters',{type:'json'});
 if(!saved)return {revision:0,chapters:defaultChapters};
 if(!Number.isSafeInteger(saved.revision)||!Array.isArray(saved.chapters))throw new Error('Configuracion de capitulos no valida');
 return saved;
}
function validChapters(items){
 if(!Array.isArray(items)||items.length>100)return false;
 const ids=new Set();
 for(const ch of items){
  if(!ch||typeof ch!=='object'||typeof ch.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(ch.id)||ids.has(ch.id)||typeof ch.title!=='string'||!ch.title.trim()||ch.title.length>100||typeof ch.intro!=='string'||ch.intro.length>1500)return false;
  ids.add(ch.id);
 }
 return true;
}
const adminHtml=String.raw`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Montse · Panel de administración</title><style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#46344c;background:#f8f1eb}*{box-sizing:border-box}body{margin:0;padding:24px 14px}main{max-width:870px;margin:auto}header{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}h1{color:#854c68;margin:10px 0}p{line-height:1.5}button,input,textarea{font:inherit}button{cursor:pointer;border:1px solid #bda2b2;background:white;border-radius:10px;padding:10px 13px;color:#543b50}button.primary{background:#884d72;color:white;border-color:#884d72}button:disabled{opacity:.4;cursor:default}.item{background:#fff;border:1px solid #e7d7df;border-radius:15px;padding:15px;margin:12px 0;display:grid;gap:9px;box-shadow:0 3px 12px #bfa6ae16}.line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.line strong{flex:1}input,textarea{width:100%;border:1px solid #cbbac5;border-radius:8px;padding:9px;background:#fff}textarea{min-height:65px;resize:vertical}.actions{display:flex;flex-wrap:wrap;gap:8px}.small{font-size:13px;color:#705f6e}.notice{padding:12px;border-radius:10px;background:#fff4dc;margin:15px 0}.error{background:#ffe1e1}.success{background:#e0f3e6}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.danger{color:#a32240}label{font-size:13px;color:#705f6e}#status{min-height:28px}@media(max-width:520px){body{padding:12px}h1{font-size:24px}}

/* Selector de apariencia: vista previa local, no altera el libro ni el almacenamiento. */
.appearance{margin:20px 0 26px;padding:18px;background:#fffaf5;border:1px solid #e7d7df;border-radius:18px;box-shadow:0 6px 20px #bfa6ae20}.appearance h2{margin:0 0 5px;color:#854c68}.appearance .themes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:16px 0}.appearance .theme{display:block;text-align:left;padding:10px;border:2px solid #e4d5da;border-radius:12px;background:white}.appearance .theme[aria-pressed="true"]{border-color:#884d72;box-shadow:0 0 0 2px #884d7220}.swatch{display:block;height:52px;border-radius:7px;margin-bottom:7px;background:linear-gradient(120deg,var(--outer),var(--paper));border:1px solid #0001}.theme-name{font-weight:650;font-size:13px}.appearance .mock{--outer:#e6cdbb;--paper:#fff5e9;--ink:#8c4f6a;--accent:#cf8f82;background:var(--outer);padding:clamp(12px,3vw,25px);border-radius:14px;transition:background .2s}.appearance .mock[data-theme="classic"]{--outer:#eee3d9;--paper:#fffaf4;--ink:#854c68;--accent:#b5a092}.appearance .mock[data-theme="floral"]{--outer:#e4eacb;--paper:#fff7e9;--ink:#9a5373;--accent:#e49c61}.appearance .mock[data-theme="burgundy"]{--outer:#56343c;--paper:#f5e9d7;--ink:#733e48;--accent:#b58c51}.mockbook{display:grid;grid-template-columns:1fr 1fr;min-height:210px;background:var(--paper);color:var(--ink);border-radius:6px 12px 12px 6px;box-shadow:0 10px 24px #321b2340;overflow:hidden;font-family:Georgia,serif}.mockpage{position:relative;padding:20px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px}.mockpage:first-child{border-right:4px solid #bd9e8a55}.mockpage h3{font-size:clamp(18px,3vw,30px);font-weight:normal;margin:0}.mockpage .ornament{color:var(--accent);font-size:25px}.mockphoto{width:75%;max-width:190px;aspect-ratio:4/3;border:8px solid #fff;box-shadow:0 5px 15px #0003;transform:rotate(-4deg);background:linear-gradient(165deg,#f1bc9c 5%,#f7d2af 45%,#7e9292 46%,#547d85 75%,#c8ab86)}.mock[data-theme="classic"] .mockphoto{transform:none}.mock[data-theme="floral"] .mockphoto{transform:rotate(4deg)}.mock[data-theme="burgundy"] .mockphoto{border-color:#ead6b6}.mocknote{font-style:italic;font-size:14px}.appearance .disclaimer{font-size:12px;color:#705f6e;margin:12px 0 0}@media(max-width:620px){.appearance .themes{grid-template-columns:repeat(2,minmax(0,1fr))}.mockbook{min-height:180px}.mockpage{padding:12px 7px}.mockphoto{border-width:5px}}

/* Navegacion del panel: las herramientas originales permanecen aisladas. */
.admin-screen[hidden]{display:none!important}.dashboard-intro{color:#705f6e;margin:4px 0 22px}.admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin:20px 0}.admin-tile{display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-height:155px;padding:20px;text-align:left;border:1px solid #dfcbd5;border-radius:17px;background:#fffaf6;box-shadow:0 5px 18px #5d345013}.admin-tile:hover:not(:disabled){border-color:#945775;box-shadow:0 8px 23px #5d345028}.admin-tile .tile-icon{font-size:29px}.admin-tile strong{font-size:19px;color:#76435f}.admin-tile small{line-height:1.5;color:#705f6e}.admin-tile:disabled{background:#f3eef0;opacity:.72;cursor:not-allowed}.admin-tile .soon{font-size:12px;color:#805e71}.screen-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:18px 0}.screen-head h2{margin:0;color:#854c68}.back-button{font-weight:600}.dashboard-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:20px}@media(max-width:560px){.admin-grid{grid-template-columns:1fr}.admin-tile{min-height:115px}}
</style></head><body><main>
<section id="screen-home" class="admin-screen">
 <header><div><div class="small">Álbum de Montse · Administración privada</div><h1>Panel de administración</h1></div><a href="/album.html">← Volver al libro</a></header>
 <p class="dashboard-intro">Elige qué quieres gestionar. Cada herramienta tiene su propio espacio.</p>
 <div class="admin-grid">
  <button type="button" class="admin-tile" data-open-screen="chapters"><span class="tile-icon">📖</span><strong>Capítulos</strong><small>Crear, editar, ordenar y eliminar capítulos.</small></button>
  <button type="button" class="admin-tile" data-open-screen="appearance"><span class="tile-icon">🎨</span><strong>Apariencia</strong><small>Comparar los cuatro diseños del álbum.</small></button>
  <button type="button" class="admin-tile" disabled><span class="tile-icon">🖼️</span><strong>Fotografías</strong><small>Subir, organizar y eliminar imágenes.</small><span class="soon">Próximamente</span></button>
  <button type="button" class="admin-tile" disabled><span class="tile-icon">💌</span><strong>Portada y textos</strong><small>Dedicatorias, portada y mensajes.</small><span class="soon">Próximamente</span></button>
  <button type="button" class="admin-tile" disabled><span class="tile-icon">👨‍👩‍👧</span><strong>Acceso familiar</strong><small>Gestión de acceso y permisos.</small><span class="soon">Próximamente</span></button>
  <button type="button" class="admin-tile" disabled><span class="tile-icon">📦</span><strong>Copia sin conexión</strong><small>Descargar el álbum para utilizarlo sin Internet.</small><span class="soon">Próximamente</span></button>
 </div>
 <div class="dashboard-actions"><button type="button" id="exit">Salir de administración</button></div>
</section>
<section id="screen-chapters" class="admin-screen" hidden>
 <div class="screen-head"><button type="button" class="back-button" data-back-home>← Volver al panel</button><h2>Gestionar capítulos</h2></div>
 <p>Organiza los capítulos. Los cambios se guardan en Netlify, pero <strong>todavía no modifican el libro V4</strong>; conectaremos ambos en una etapa posterior.</p>
 <div class="notice">La gestión de capítulos está operativa. Las fotografías se incorporarán después.</div>
 <div class="toolbar"><button type="button" id="add">＋ Añadir capítulo</button><button type="button" class="primary" id="save">Guardar cambios</button><button type="button" id="reload">Recargar</button></div>
 <div id="status" role="status" aria-live="polite"></div><div id="items"></div>
</section>
<section id="screen-appearance" class="admin-screen" hidden>
 <div class="screen-head"><button type="button" class="back-button" data-back-home>← Volver al panel</button><h2>Apariencia del álbum</h2></div>
 <section class="appearance" aria-labelledby="appearance-title"><h2 id="appearance-title">🎨 Prueba de diseños</h2><p class="small">Prueba los cuatro diseños. Esta vista previa es local: no cambia el álbum real ni los datos guardados.</p><div class="themes" id="theme-options"><button type="button" class="theme" data-theme="romantic" aria-pressed="true" style="--outer:#e6cdbb;--paper:#fff5e9"><span class="swatch"></span><span class="theme-name">🌸 Romántico scrapbook</span></button><button type="button" class="theme" data-theme="classic" aria-pressed="false" style="--outer:#eee3d9;--paper:#fffaf4"><span class="swatch"></span><span class="theme-name">📖 Clásico elegante</span></button><button type="button" class="theme" data-theme="floral" aria-pressed="false" style="--outer:#e4eacb;--paper:#fff7e9"><span class="swatch"></span><span class="theme-name">🌼 Floral y alegre</span></button><button type="button" class="theme" data-theme="burgundy" aria-pressed="false" style="--outer:#56343c;--paper:#f5e9d7"><span class="swatch"></span><span class="theme-name">✨ Burdeos y dorado</span></button></div><div class="mock" id="theme-preview" data-theme="romantic"><div class="mockbook"><div class="mockpage"><div class="ornament">❀ ♡ ❀</div><small>CAPÍTULO 1</small><h3>Así empezó todo</h3><div class="ornament">❦</div></div><div class="mockpage"><div class="mockphoto" role="img" aria-label="Imagen de muestra abstracta"></div><div class="mocknote">Una historia que merece contarse</div></div></div></div><p class="disclaimer" id="theme-caption">Vista previa: Romántico scrapbook. No se han aplicado cambios al libro.</p></section>
</section>
</main><script>
let chapters=[],revision=0,dirty=false;const el=id=>document.getElementById(id);
// Navegacion interna: no recarga el documento ni modifica la API.
function showScreen(name){
 if(name!=='chapters'&&name!=='appearance'&&name!=='home')return;
 if(name==='home'&&dirty&&!confirm('Hay cambios en capítulos sin guardar. Se conservarán mientras permanezcas aquí. ¿Volver al panel?'))return;
 for(const section of document.querySelectorAll('.admin-screen'))section.hidden=section.id!=='screen-'+name;
 window.scrollTo(0,0);
}
document.querySelectorAll('[data-open-screen]').forEach(button=>button.addEventListener('click',()=>showScreen(button.dataset.openScreen)));
document.querySelectorAll('[data-back-home]').forEach(button=>button.addEventListener('click',()=>showScreen('home')));

// La seleccion es solo visual; no modifica revision, capitulos ni Netlify Blobs.
const themeNames={romantic:'Romántico scrapbook',classic:'Clásico elegante',floral:'Floral y alegre',burgundy:'Burdeos y dorado'};
document.getElementById('theme-options').addEventListener('click',event=>{
 const button=event.target.closest('button[data-theme]');if(!button)return;
 const theme=button.dataset.theme;if(!Object.prototype.hasOwnProperty.call(themeNames,theme))return;
 document.getElementById('theme-preview').dataset.theme=theme;
 document.querySelectorAll('#theme-options button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 document.getElementById('theme-caption').textContent='Vista previa: '+themeNames[theme]+'. No se han aplicado cambios al libro.';
});

function status(msg,cls=''){el('status').className=cls?'notice '+cls:'';el('status').textContent=msg}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mark(){dirty=true;status('Cambios pendientes de guardar.','')}
function draw(){el('items').innerHTML=chapters.map((c,i)=>'<section class="item" data-id="'+escapeHtml(c.id)+'"><div class="line"><strong>Capítulo '+(i+1)+'</strong><button data-action="up" '+(i===0?'disabled':'')+' aria-label="Subir capítulo">↑</button><button data-action="down" '+(i===chapters.length-1?'disabled':'')+' aria-label="Bajar capítulo">↓</button><button data-action="delete" class="danger">Eliminar</button></div><label>Nombre<input maxlength="100" data-field="title" value="'+escapeHtml(c.title)+'"></label><label>Introducción<textarea maxlength="1500" data-field="intro">'+escapeHtml(c.intro)+'</textarea></label></section>').join('')||'<p>Todavía no hay capítulos. Pulsa «Añadir capítulo».</p>'}
el('items').addEventListener('input',e=>{const field=e.target.dataset.field;if(!field)return;const section=e.target.closest('[data-id]');const c=chapters.find(x=>x.id===section.dataset.id);if(c){c[field]=e.target.value;mark()}});
el('items').addEventListener('click',e=>{const action=e.target.dataset.action;if(!action)return;const section=e.target.closest('[data-id]');const i=chapters.findIndex(x=>x.id===section.dataset.id);if(i<0)return;if(action==='delete'){if(!confirm('¿Eliminar el capítulo «'+chapters[i].title+'»? Esta fase aún no contiene fotografías.'))return;chapters.splice(i,1)}else{const j=i+(action==='up'?-1:1);if(j<0||j>=chapters.length)return;[chapters[i],chapters[j]]=[chapters[j],chapters[i]]}mark();draw()});
el('add').onclick=()=>{if(chapters.length>=100)return status('Máximo técnico de 100 capítulos.','error');chapters.push({id:'cap-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),title:'Nuevo capítulo',intro:''});mark();draw()};
// Mantiene la revision mas reciente vista por esta pestaña, incluso tras Ctrl+R.
const revisionKey='montse-capitulos-revision-v3';
function knownRevision(){try{return Number(sessionStorage.getItem(revisionKey))||0}catch{return 0}}
function rememberRevision(n){try{sessionStorage.setItem(revisionKey,String(Math.max(knownRevision(),n)))}catch{}}
async function load(){
 if(dirty&&!confirm('Hay cambios sin guardar. ¿Descartarlos?'))return;
 const minimum=Math.max(revision,knownRevision());
 try{
  for(let attempt=0;attempt<6;attempt++){
   const r=await fetch('/api/capitulos?actualizar='+Date.now()+'-'+attempt,{credentials:'same-origin',cache:'no-store'});
   if(!r.ok)throw new Error('No se pueden leer los capítulos ('+r.status+').');
   const data=await r.json();
   if(!Number.isSafeInteger(data.revision)||!Array.isArray(data.chapters))throw new Error('Respuesta de capítulos incorrecta.');
   if(data.revision<minimum){
    if(attempt===5)throw new Error('El servidor ha enviado una revisión anterior ('+data.revision+') a la ya guardada ('+minimum+'). No se muestran datos antiguos. Pulsa Recargar para reintentar.');
    await new Promise(resolve=>setTimeout(resolve,400));
    continue;
   }
   chapters=data.chapters;revision=data.revision;rememberRevision(revision);dirty=false;draw();
   status('Capítulos cargados correctamente. Revisión '+revision+'.','success');return;
  }
 }catch(e){status(e.message,'error')}
}
el('reload').onclick=load;
el('save').onclick=async()=>{if(!chapters.every(c=>c.title.trim()))return status('Todos los capítulos deben tener nombre.','error');el('save').disabled=true;try{const r=await fetch('/api/capitulos',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({revision,chapters})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Error al guardar ('+r.status+').');revision=data.revision;rememberRevision(revision);dirty=false;status('Cambios guardados correctamente. Revisión '+revision+'.','success')}catch(e){status(e.message,'error')}finally{el('save').disabled=false}};
el('exit').onclick=async()=>{if(dirty&&!confirm('¿Salir sin guardar los cambios?'))return;await fetch('/admin/salir',{method:'POST',credentials:'same-origin'});location.href='/'};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});load();
</script></body></html>`;
function adminLogin(error=false){return page(`<span class="pill">🔐 Zona privada</span><h1 style="font-size:2.4rem">Administración</h1><p>Introduce la contraseña de administración. La contraseña familiar no sirve para editar.</p><form method="post" action="/admin/entrar"><label for="admin-password">Contraseña de administrador</label><br><input id="admin-password" name="password" type="password" required autocomplete="current-password" maxlength="200"><br><button class="btn">Entrar al administrador</button></form>${error?'<p class="error">Contraseña incorrecta.</p>':''}<p><a href="/">Volver al álbum</a></p>`)}

exports.handler=async event=>{
  try {
  if(!secret||!password||secret.length<32) return respond('<h1>Configuración pendiente</h1><p>Define ALBUM_PASSWORD y SESSION_SECRET en Netlify.</p>',503);
  const path = event.path || '/';

  // Las rutas de administración requieren primero la sesión familiar y después la clave administrativa.
  if(path==='/admin'||path==='/admin/'||path==='/admin/entrar'||path==='/admin/salir'||path==='/api/capitulos'){
    if(!await authenticated(event))return event.httpMethod==='GET'?respond(login(false),401):adminResponse({error:'Sesión familiar caducada. Vuelve a entrar.'},401);
    if(path==='/admin/entrar'&&event.httpMethod==='POST'){
      if(crossSite(event))return respond('Origen no autorizado',403);
      if(!adminPassword)return respond('Contraseña de administrador no configurada',503);
      const data=new URLSearchParams(event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'');
      const input=data.get('password')||'';
      if(!safeEqual(input,adminPassword))return respond(adminLogin(true),401);
      return {statusCode:303,headers:{Location:'/admin','Set-Cookie':adminCookie(now()+adminLifetime),'Cache-Control':'no-store'}};
    }
    if(path==='/admin/salir'&&event.httpMethod==='POST'){
      if(crossSite(event))return respond('Origen no autorizado',403);
      return {statusCode:303,headers:{Location:'/', 'Set-Cookie':`${adminCookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,'Cache-Control':'no-store'}};
    }
    if(path==='/admin'||path==='/admin/'){
      if(event.httpMethod!=='GET')return respond('Método no permitido',405);
      if(!adminPassword)return respond('<h1>Falta configurar ALBUM_ADMIN_PASSWORD en Netlify</h1>',503);
      return adminAuthenticated(event)
        ? respond(adminHtml,200,{'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"})
        : respond(adminLogin());
    }
    if(path==='/api/capitulos'){
      if(!adminAuthenticated(event))return adminResponse({error:'Acceso de administración no autorizado.'},401);
      if(event.httpMethod==='GET')return adminResponse(await loadChapters(event));
      if(event.httpMethod!=='POST')return adminResponse({error:'Método no permitido.'},405);
      if(crossSite(event))return adminResponse({error:'Origen no autorizado.'},403);
      if(!/^application\/json(?:\s*;|$)/i.test(event.headers['content-type']||event.headers['Content-Type']||''))return adminResponse({error:'Formato no admitido.'},415);
      if((event.body||'').length>300000)return adminResponse({error:'Petición demasiado grande.'},413);
      let payload;
      try{payload=JSON.parse(event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'');}catch{return adminResponse({error:'Datos JSON incorrectos.'},400)}
      if(!payload||!Number.isSafeInteger(payload.revision)||!validChapters(payload.chapters))return adminResponse({error:'Datos de capítulos no válidos.'},400);
      const current=await loadChapters(event);
      if(current.revision!==payload.revision)return adminResponse({error:'Otra persona ha guardado cambios. Recarga los capítulos antes de guardar para no sobrescribirlos.'},409);
      const updated={revision:current.revision+1,chapters:payload.chapters.map(c=>({id:c.id,title:c.title.trim(),intro:c.intro.trim()}))};
      connectLambda(event);await getStore(chapterStoreName).setJSON('chapters',updated);
      return adminResponse({revision:updated.revision,ok:true});
    }
    return respond('Método no permitido',405);
  }

  if (event.httpMethod==='GET' && path.startsWith('/media/')) {
    if (!await authenticated(event)) return respond('<h1>Acceso denegado</h1>',401);
    const key=path.slice('/media/'.length);
    if(key==='prueba.svg') {
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="350" viewBox="0 0 800 350"><rect width="800" height="350" fill="#ffe49e"/><text x="400" y="125" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#a32d77">🌸 MONTSE 57 🌸</text><text x="400" y="205" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#5d376b">Imagen protegida de prueba</text></svg>';
      return {statusCode:200,headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store, no-cache, must-revalidate, private','Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'},body:svg};
    }
    if(!/^[a-zA-Z0-9_\/-]+\.(jpg|jpeg|png|webp|gif|mp4)$/.test(key) || key.includes('..')) return respond('No encontrado',404);
    try {
      connectLambda(event);
      const store=getStore('montse-fotos-privadas');
      const data=await store.get(key,{type:'arrayBuffer'});
      if(data===null) return respond('No encontrado',404);
      const ext=key.split('.').pop().toLowerCase();
      const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',mp4:'video/mp4'};
      return {statusCode:200,isBase64Encoded:true,headers:{'Content-Type':types[ext],'Cache-Control':'no-store, no-cache, must-revalidate, private','Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff'},body:Buffer.from(data).toString('base64')};
    } catch(e) {console.error('Error de almacenamiento privado:',e.message);return respond('Almacenamiento no disponible',503);}
  }
  if(event.httpMethod==='POST' && path==='/entrar') {
    if(crossSite(event)) return respond('<h1>Origen no autorizado</h1>',403);
    const {sessions}=stores(event);
    const data = new URLSearchParams(event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'');
    const input=data.get('password')||'';
    const a=crypto.createHash('sha256').update(input).digest();const b=crypto.createHash('sha256').update(password).digest();
    if(!crypto.timingSafeEqual(a,b))return respond(login(true),401);
    const token=crypto.randomBytes(32).toString('hex');
    await sessions.setJSON(sessionKey(token),{expires:now()+DAYS});
    return {statusCode:303,headers:{Location:'/', 'Set-Cookie':`montse_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DAYS}`, 'Cache-Control':'no-store'}};
  }
  if(event.httpMethod==='POST' && path==='/salir'){
    if(crossSite(event))return respond('<h1>Origen no autorizado</h1>',403);
    const token=cookieToken(event.headers);
    if(token){const {sessions}=stores(event);await sessions.delete(sessionKey(token));}
    return {statusCode:303,headers:{Location:'/', 'Set-Cookie':'montse_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0','Cache-Control':'no-store'}};
  }
  if(event.httpMethod==='GET' && path==='/album.html') {
    if(!await authenticated(event)) return respond(login(false),401);
    return respond(Buffer.from(bookHtmlBase64,'base64').toString('utf8'));
  }
  if(event.httpMethod!=='GET')return respond('Método no permitido',405);
  return respond(await authenticated(event)?inside:login(false));
  } catch(e) {console.error('Error seguro en album:',e);return respond('<h1>Servicio temporalmente no disponible</h1>',503);}
};
