/* ============================================================================
   NOTIFICACIONES — centro interno + avisos del navegador
   Las alertas se derivan de los datos actuales; el historial y preferencias
   se guardan por dispositivo para no crear registros duplicados en la nube.
   ========================================================================== */

const NOTIF_PREF_KEY = 'nexa_notif_prefs_v1';
const NOTIF_HIST_KEY = 'nexa_notif_hist_v1';
const NOTIF_ENV_KEY  = 'nexa_notif_enviadas_v1';

const notifDefaults = {
  navegador:false, tareas:true, proyectos:true, caja:true, formularios:true,
  novedades:true, calendario:true, anticipacion:3
};

function notifPrefs(){
  try{ return { ...notifDefaults, ...JSON.parse(localStorage.getItem(NOTIF_PREF_KEY) || '{}') }; }
  catch{ return { ...notifDefaults }; }
}
function guardarNotifPrefs(cambios){
  localStorage.setItem(NOTIF_PREF_KEY, JSON.stringify({ ...notifPrefs(), ...cambios }));
}
function notifHistorial(){
  try{ return JSON.parse(localStorage.getItem(NOTIF_HIST_KEY) || '[]'); }
  catch{ return []; }
}
function guardarNotifHistorial(h){
  localStorage.setItem(NOTIF_HIST_KEY, JSON.stringify(h.slice(0,150)));
}

function notificacionesActuales(){
  if(!S) return [];
  const m = metricas(), p = notifPrefs(), hoy = hoyISO(), a = [];
  const add = (clave,tipo,tono,ico,titulo,detalle,ir) => {
    if(p[tipo] !== false) a.push({ clave, tipo, tono, ico, titulo, detalle, ir, fecha:hoy });
  };

  if(m.vencidas.length) add('tareas_vencidas','tareas','d','⏰',
    `${m.vencidas.length} tarea${m.vencidas.length>1?'s':''} vencida${m.vencidas.length>1?'s':''}`,
    m.vencidas.slice(0,3).map(t=>t.titulo).join(' · '),'tareas');
  if(m.hoy.length) add('tareas_hoy','tareas','w','📌',
    `${m.hoy.length} tarea${m.hoy.length>1?'s':''} para hoy`,m.hoy.slice(0,3).map(t=>t.titulo).join(' · '),'tareas');
  if(m.esperaAtrasada.length) add('seguimientos_atrasados','tareas','w','⏳',
    `${m.esperaAtrasada.length} seguimiento${m.esperaAtrasada.length>1?'s':''} atrasado${m.esperaAtrasada.length>1?'s':''}`,
    m.esperaAtrasada.slice(0,3).map(t=>t.espera_que||t.titulo).join(' · '),'tareas');

  if(m.proyRiesgo.length) add('proyectos_riesgo','proyectos','d','📁',
    `${m.proyRiesgo.length} proyecto${m.proyRiesgo.length>1?'s':''} en riesgo`,m.proyRiesgo.map(x=>x.nombre).join(' · '),'proyectos');
  const prox = m.proyActivos.filter(x=>x.vence && diasDesde(x.vence)>=0 && diasDesde(x.vence)<=+p.anticipacion);
  if(prox.length) add('proyectos_proximos','proyectos','w','📅',
    `${prox.length} proyecto${prox.length>1?'s':''} próximo${prox.length>1?'s':''} a vencer`,
    prox.map(x=>`${x.nombre}: ${fechaTxt(x.vence)}`).join(' · '),'proyectos');

  const q=m.arqueo;
  if(q.sinLegalizar.length) add('caja_sin_legalizar','caja','w','🧾',
    `${q.sinLegalizar.length} movimientos sin legalizar`,`${cop(q.montoSinLeg)} pendientes`,'caja');
  if(q.pctUsado>=CFG.topeAlertaCaja) add('caja_tope','caja','w','💸',
    `Caja menor al ${Math.round(q.pctUsado*100)}%`,`Quedan ${cop(q.saldo)} de la base`,'caja');

  if(m.novCriticas.length) add('novedades_criticas','novedades','d','⚠️',
    `${m.novCriticas.length} novedad${m.novCriticas.length>1?'es':''} crítica${m.novCriticas.length>1?'s':''}`,
    m.novCriticas.slice(0,3).map(x=>x.titulo).join(' · '),'novedades');
  if(m.eventosAviso.length) add('eventos_proximos','calendario','w','🔔',
    `${m.eventosAviso.length} fecha${m.eventosAviso.length>1?'s':''} próxima${m.eventosAviso.length>1?'s':''}`,
    m.eventosAviso.slice(0,3).map(x=>x.ev.titulo).join(' · '),'calendario');

  const nuevas = S.respuestas.filter(r => (Date.now()-new Date(r.created_at).getTime()) < 86400000);
  if(nuevas.length) add('formularios_respuestas','formularios','b','📝',
    `${nuevas.length} respuesta${nuevas.length>1?'s':''} de formulario en las últimas 24 horas`,
    'Revísalas desde el proyecto correspondiente','proyectos');
  return a;
}

function sincronizarHistorialNotificaciones(){
  const hist = notifHistorial(), ahora = new Date().toISOString(), activas = notificacionesActuales();
  for(const n of activas){
    const claveDia = `${n.fecha}:${n.clave}`, ex = hist.find(x=>x.id===claveDia);
    if(ex) Object.assign(ex,{...n,ultima_vez:ahora,activa:true});
    else hist.unshift({...n,id:claveDia,primera_vez:ahora,ultima_vez:ahora,atendida:false,activa:true});
  }
  const ids = new Set(activas.map(n=>`${n.fecha}:${n.clave}`));
  hist.forEach(x=>{ if(x.fecha===hoyISO()&&!ids.has(x.id)) x.activa=false; });
  guardarNotifHistorial(hist); return hist;
}

const notificacionesPendientes = () => sincronizarHistorialNotificaciones().filter(x=>x.activa&&!x.atendida).length;

async function permisoNotificaciones(){
  if(!('Notification' in window)){ toast('Este navegador no admite notificaciones'); return false; }
  const permiso = Notification.permission==='default' ? await Notification.requestPermission() : Notification.permission;
  const ok = permiso==='granted'; guardarNotifPrefs({navegador:ok});
  if(ok){ await registrarServiceWorker(); toast('Avisos del navegador activados ✓'); }
  else toast('El navegador no autorizó los avisos');
  render(); return ok;
}

async function registrarServiceWorker(){
  if(!('serviceWorker' in navigator)) return null;
  try{ return await navigator.serviceWorker.register('./sw.js?v=33'); }
  catch(e){ console.warn('No se pudo registrar el service worker',e); return null; }
}

async function mostrarAvisoNavegador(titulo,detalle,tag='nexa-prueba'){
  if(Notification.permission!=='granted') return false;
  const reg=await registrarServiceWorker();
  if(reg) await reg.showNotification(titulo,{body:detalle,tag,icon:'assets/nexa-app-icon-512.png',badge:'assets/nexa-logo-white.png',data:{url:location.origin+location.pathname}});
  else new Notification(titulo,{body:detalle,tag});
  return true;
}

async function probarNotificacion(){
  if(Notification.permission!=='granted' && !await permisoNotificaciones()) return;
  await mostrarAvisoNavegador('NEXA · Aviso de prueba','Las notificaciones del navegador están funcionando.');
  toast('Aviso de prueba enviado ✓');
}

async function enviarNotificacionesNuevas(){
  const p=notifPrefs(); if(!p.navegador||Notification.permission!=='granted') return;
  const hist=sincronizarHistorialNotificaciones(), hoy=hoyISO();
  let enviados={}; try{enviados=JSON.parse(localStorage.getItem(NOTIF_ENV_KEY)||'{}')}catch{}
  for(const n of hist.filter(x=>x.fecha===hoy&&x.activa&&!x.atendida&&!enviados[x.id])){
    await mostrarAvisoNavegador(`NEXA · ${n.titulo}`,n.detalle,n.id); enviados[n.id]=new Date().toISOString();
  }
  localStorage.setItem(NOTIF_ENV_KEY,JSON.stringify(enviados));
}

function atenderNotificacion(id){
  const h=notifHistorial(), n=h.find(x=>x.id===id); if(n)n.atendida=true; guardarNotifHistorial(h); render();
}
function reabrirNotificacion(id){
  const h=notifHistorial(), n=h.find(x=>x.id===id); if(n)n.atendida=false; guardarNotifHistorial(h); render();
}
function atenderTodasNotificaciones(){
  const h=notifHistorial(); h.forEach(x=>{if(x.activa)x.atendida=true}); guardarNotifHistorial(h); render(); toast('Todo marcado como atendido');
}
function abrirNotificacion(id){
  const n=notifHistorial().find(x=>x.id===id); if(!n)return; atenderNotificacion(id); go(n.ir);
}
function cambiarPreferenciaNotif(clave,valor){ guardarNotifPrefs({[clave]:valor}); repintarPanel(); }

let panelNotificacionesAbierto=false;

function renderCampanaSuperior(){
  const host=$('#notifTop'); if(!host||!S)return;
  const n=notificacionesPendientes();
  host.innerHTML=`<button class="notif-top-btn ${n?'con-alertas':''} ${panelNotificacionesAbierto?'activo':''}"
    onclick="togglePanelNotificaciones()" title="${n?`${n} notificación${n===1?'':'es'} pendiente${n===1?'':'s'}`:'Sin notificaciones pendientes'}"
    aria-label="Notificaciones" aria-expanded="${panelNotificacionesAbierto}">
    <span class="notif-top-ico">${ICO.campana}</span>${n?`<span class="notif-top-badge">${n>99?'99+':n}</span>`:''}</button>`;
  if(panelNotificacionesAbierto) pintarPanelNotificaciones();
}

function togglePanelNotificaciones(forzar=null){
  panelNotificacionesAbierto=forzar===null?!panelNotificacionesAbierto:!!forzar;
  const panel=$('#notifPanel'); if(!panel)return;
  panel.classList.toggle('abierto',panelNotificacionesAbierto);
  panel.setAttribute('aria-hidden',String(!panelNotificacionesAbierto));
  renderCampanaSuperior();
}

function pintarPanelNotificaciones(){
  const panel=$('#notifPanel'); if(!panel)return;
  const hist=sincronizarHistorialNotificaciones(), pendientes=hist.filter(x=>x.activa&&!x.atendida);
  panel.innerHTML=`<div class="notif-panel-head"><div><strong>Notificaciones</strong><small>${pendientes.length?`${pendientes.length} requieren atención`:'Todo está al día'}</small></div>
    <button class="notif-panel-cerrar" onclick="togglePanelNotificaciones(false)" aria-label="Cerrar notificaciones">×</button></div>
    <div class="notif-panel-body">${pendientes.length?pendientes.slice(0,8).map(n=>`
      <div class="notif-panel-fila"><button class="notif-panel-info" onclick="abrirNotificacionPanel('${n.id}')">
        <span class="notif-ico ${n.tono}">${n.ico}</span><span><strong>${esc(n.titulo)}</strong><small>${esc(n.detalle)}</small><em>Hoy</em></span></button>
        <button class="notif-panel-check" onclick="atenderDesdePanel('${n.id}')" title="Marcar atendida" aria-label="Marcar ${esc(n.titulo)} como atendida">✓</button></div>`).join(''):
      `<div class="notif-panel-vacio"><span>✓</span><strong>Todo bajo control</strong><small>No hay notificaciones pendientes.</small></div>`}</div>
    <div class="notif-panel-foot">${pendientes.length?`<button onclick="atenderTodasDesdePanel()">✓ Atender todas</button>`:'<span></span>'}
      <button class="principal" onclick="go('notificaciones')">Ver historial completo →</button></div>`;
}

function atenderDesdePanel(id){ atenderNotificacion(id); panelNotificacionesAbierto=true; pintarPanelNotificaciones(); renderCampanaSuperior(); }
function atenderTodasDesdePanel(){ atenderTodasNotificaciones(); panelNotificacionesAbierto=true; pintarPanelNotificaciones(); renderCampanaSuperior(); }
function abrirNotificacionPanel(id){
  const n=notifHistorial().find(x=>x.id===id); if(!n)return;
  atenderNotificacion(id); panelNotificacionesAbierto=true; pintarPanelNotificaciones(); renderCampanaSuperior(); go(n.ir);
}

function iniciarNotificaciones(){
  sincronizarHistorialNotificaciones(); registrarServiceWorker();
  setTimeout(enviarNotificacionesNuevas,900);
  setInterval(()=>{ sincronizarHistorialNotificaciones(); enviarNotificacionesNuevas(); },300000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){sincronizarHistorialNotificaciones();render();}});
}
