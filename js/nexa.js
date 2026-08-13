/* ============================================================================
   NEXA — interfaz y consultas seguras del asistente.
   - Sin Edge Function: responde únicamente con datos locales ya cargados.
   - Con Edge Function: consulta la IA con el usuario autenticado.
   NEXA nunca modifica registros desde este archivo.
   ========================================================================== */

const NEXA_KEY = () => `nexa_chat_v1_${usuario?.id || 'local'}`;
let nexaAbierto = false;
let nexaHistorial = [];
let nexaEstadoActual = 'disponible';
let nexaEstadoTexto = '🔒 Análisis privado';

function nexaCargarHistorial(){
  try { nexaHistorial = JSON.parse(localStorage.getItem(NEXA_KEY())) || []; }
  catch { nexaHistorial = []; }
  if(!nexaHistorial.length) nexaHistorial = [{rol:'bot', texto:'¡Hola! Soy NEXA ✨\nPuedo revisar tus tareas, caja, novedades y proyectos. ¿Qué revisamos?'}];
}

function nexaGuardarHistorial(){
  localStorage.setItem(NEXA_KEY(), JSON.stringify(nexaHistorial.slice(-18)));
}

function nexaTextoSeguro(texto){ return esc(texto).replace(/\n/g, '<br>'); }

function renderNexa(){
  const caja = $('#nexaChat');
  if(!caja) return;
  caja.classList.toggle('on', nexaAbierto);
  caja.setAttribute('aria-hidden', String(!nexaAbierto));
  if(!nexaAbierto) return;
  caja.innerHTML = `
    <div class="nexa-chat-head" data-estado="${nexaEstadoActual}">
      <div class="nexa-head-mascota"><img src="assets/nexa-bot/nexa-mascota-flotante-v2.png" alt="NEXA"></div>
      <div><strong>NEXA</strong><small>Tu asistente inteligente</small><span class="nexa-estado" id="nexaEstado">${nexaTextoSeguro(nexaEstadoTexto)}</span></div>
      <button class="nexa-cerrar" type="button" onclick="toggleNexa()" aria-label="Cerrar NEXA">×</button>
    </div>
    <div class="nexa-mensajes" id="nexaMensajes">
      ${nexaHistorial.map(m => `<div class="nexa-msg ${m.rol === 'user' ? 'user' : 'bot'}">${nexaTextoSeguro(m.texto)}</div>`).join('')}
    </div>
    <div class="nexa-sugerencias">
      <button type="button" onclick="nexaPreguntar('¿Qué debería priorizar hoy?')">Prioridades de hoy</button>
      <button type="button" onclick="nexaPreguntar('Dame un resumen general')">Resumen general</button>
      <button type="button" onclick="nexaPreguntar('Resume la caja actual')">Resumen de caja</button>
      <button type="button" onclick="nexaPreguntar('¿Qué novedades requieren atención?')">Novedades</button>
    </div>
    <form class="nexa-form" onsubmit="nexaEnviar(event)">
      <input id="nexaInput" autocomplete="off" placeholder="Escribe tu consulta..." aria-label="Mensaje para NEXA">
      <button class="nexa-enviar" type="submit" aria-label="Enviar mensaje">↑</button>
    </form>`;
  nexaBajar();
}

function toggleNexa(){
  nexaAbierto = !nexaAbierto;
  renderNexa();
  if(nexaAbierto) setTimeout(() => $('#nexaInput')?.focus(), 50);
}

function nexaBajar(){ const d = $('#nexaMensajes'); if(d) d.scrollTop = d.scrollHeight; }
function nexaEstado(texto, estado = 'disponible'){
  nexaEstadoActual = estado;
  nexaEstadoTexto = texto;
  const e = $('#nexaEstado'); if(e) e.textContent = texto;
  const h = document.querySelector('.nexa-chat-head'); if(h) h.dataset.estado = estado;
  const fab = $('#nexaFab'); if(fab) fab.dataset.estado = estado;
}

function nexaResponderLocal(mensaje){
  const q = mensaje.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const m = metricas();
  const hay = patron => patron.test(q);
  const lista = (filas, campo = 'titulo', max = 4) => filas.slice(0,max).map(x => `• ${x[campo] || 'Sin nombre'}`).join('\n');
  const respuestas = [];

  if(hay(/resumen|panorama|estado general|como va|como estoy|diagnostico/)){
    const alertas = m.vencidas.length + m.novCriticas.length + m.proyRiesgo.length + m.esperaAtrasada.length;
    respuestas.push(`🧠 Panorama general\nTienes ${m.pendientes.length} tareas pendientes, ${m.vencidas.length} vencidas, ${m.novAbiertas.length} novedades abiertas y ${m.proyRiesgo.length} proyectos en riesgo.\n\n${alertas ? `Detecté ${alertas} foco(s) que requieren atención.` : 'No detecté alertas críticas en este momento.'}`);
  }
  if(hay(/prioridad|priorizar|primero|por donde|que hago|plan.*hoy|organiza|urgente/)){
    const focos = [
      ...m.vencidas.map(x=>({x,p:4,motivo:'vencida'})),
      ...m.altaPendiente.map(x=>({x,p:3,motivo:'prioridad alta'})),
      ...m.hoy.map(x=>({x,p:2,motivo:'vence hoy'})),
      ...m.esperaAtrasada.map(x=>({x,p:1,motivo:'seguimiento atrasado'}))
    ].filter((v,i,a)=>a.findIndex(y=>y.x.id===v.x.id)===i).sort((a,b)=>b.p-a.p).slice(0,5);
    respuestas.push(focos.length
      ? `🎯 Orden sugerido\n${focos.map((f,i)=>`${i+1}. ${f.x.titulo} — ${f.motivo}`).join('\n')}\n\nEmpieza por la primera y evita abrir nuevas tareas hasta cerrarla o dejar un siguiente paso definido.`
      : '🎯 No hay urgencias detectadas. Elige una tarea corta de la semana y ciérrala para ganar avance.');
  }
  if(hay(/vencid|atrasad|tareas? pendiente|mis tareas|tengo.*tarea/)){
    const titulos = m.vencidas.slice(0, 4).map(t => `• ${t.titulo}${t.vence ? ` (${fechaTxt(t.vence)})` : ''}`);
    respuestas.push(m.vencidas.length ? `🚨 Hay ${m.vencidas.length} tarea(s) vencida(s).\n${titulos.join('\n')}${m.vencidas.length > 4 ? '\n• …' : ''}\n\nAdemás: ${m.hoy.length} para hoy y ${m.semana.length} para los próximos 7 días.` : `✅ No encontré tareas vencidas. Tienes ${m.hoy.length} para hoy y ${m.semana.length} para esta semana.`);
  }
  if(hay(/caja|pago|factura|soporte|reembolso|legaliz/)){
    if(!m.periodo) respuestas.push('No hay un período de caja abierto todavía. Puedes crearlo desde Caja menor.');
    else { const a = m.arqueo; respuestas.push(`💵 Caja: ${m.periodo.nombre}\nGastado: ${cop(a.gastado)} · Saldo: ${cop(a.saldo)}\nSin legalizar: ${a.sinLegalizar.length} · Sin soporte: ${a.sinSoporte.length}\nPendiente de reembolso: ${cop(a.pendiente)}${a.sinSoporte.length ? '\n\n⚠️ Completa primero los soportes faltantes.' : ''}`); }
  }
  if(hay(/novedad|incidente|alerta/)){
    respuestas.push(`⚠️ Hay ${m.novAbiertas.length} novedad(es) abierta(s): ${m.novCriticas.length} críticas y ${m.novEstancadas.length} estancadas por más de 7 días.${m.novCriticas.length ? `\n${lista(m.novCriticas)}` : ''}`);
  }
  if(hay(/proyecto|avance|riesgo/)){
    const nombres = m.proyRiesgo.slice(0,3).map(p => `• ${p.nombre}`);
    respuestas.push(`📁 Hay ${m.proyActivos.length} proyecto(s) activo(s) y ${m.proyRiesgo.length} en riesgo o cerca de vencerse.${nombres.length ? `\n${nombres.join('\n')}` : '\n✅ No detecté proyectos en riesgo por fecha.'}`);
  }
  if(respuestas.length) return respuestas.join('\n\n───\n\n');
  if(hay(/hola|buenas|que puedes|ayuda/)) return 'Puedo analizar tus datos de forma privada: preparar un resumen general, sugerir prioridades, revisar tareas, caja, novedades y proyectos.\n\nPrueba: “¿Qué debería priorizar hoy?”';
  return 'No identifiqué con certeza lo que necesitas. Puedo razonar sobre: resumen general, prioridades de hoy, tareas pendientes, caja, novedades o proyectos en riesgo.';
}

async function nexaIA(mensaje){
  if(!NUBE || !sb) throw new Error('La aplicación no está conectada a Supabase.');
  const { data, error } = await sb.functions.invoke(CFG.nexa.functionName, { body:{ mensaje } });
  if(error){
    let detalle = error.message || 'La función no respondió.';
    try {
      const cuerpo = await error.context?.clone?.().json();
      if(cuerpo?.error) detalle = cuerpo.error;
    } catch {}
    throw new Error(detalle);
  }
  if(data?.error) throw new Error(data.error);
  if(!data?.respuesta) throw new Error('La IA respondió sin contenido.');
  return data.respuesta;
}

async function nexaPreguntar(mensaje){
  if(!mensaje?.trim()) return;
  nexaHistorial.push({rol:'user', texto:mensaje.trim()});
  renderNexa();
  nexaEstado('💭 Analizando…', 'pensando');
  const local = nexaResponderLocal(mensaje);
  let respuesta = null;
  let errorIA = '';
  try { respuesta = CFG.nexa.remoteAI ? await nexaIA(mensaje) : local; }
  catch(error) {
    errorIA = error?.message || 'No fue posible conectar con la IA.';
    console.error('NEXA IA:', error);
  }
  nexaHistorial.push({rol:'bot', texto:respuesta || `${local}\n\n⚠️ IA sin conexión: ${errorIA}`});
  nexaGuardarHistorial();
  renderNexa();
  nexaEstado(CFG.nexa.remoteAI ? (respuesta ? '🟢 IA conectada' : '🔴 IA sin conexión') : '🔒 Análisis privado', respuesta ? 'disponible' : 'error');
}

function nexaEnviar(e){
  e.preventDefault();
  const input = $('#nexaInput');
  const mensaje = input?.value || '';
  if(input) input.value = '';
  nexaPreguntar(mensaje);
}

function iniciarNexa(){
  nexaCargarHistorial();
  const fab = $('#nexaFab');
  if(!fab) return;
  const clavePos = 'nexa_fab_pos_v1';
  const limitar = (n,min,max) => Math.max(min,Math.min(max,n));
  const colocar = (x,y,guardar=false) => {
    const r=fab.getBoundingClientRect(), margen=6;
    x=limitar(x,margen,innerWidth-r.width-margen); y=limitar(y,margen,innerHeight-r.height-margen);
    fab.style.left=x+'px'; fab.style.top=y+'px'; fab.style.right='auto'; fab.style.bottom='auto';
    if(guardar) localStorage.setItem(clavePos,JSON.stringify({x:x/innerWidth,y:y/innerHeight}));
  };
  try{const p=JSON.parse(localStorage.getItem(clavePos));if(p)setTimeout(()=>colocar(p.x*innerWidth,p.y*innerHeight),0);}catch{}
  let arrastre=null;
  fab.addEventListener('pointerdown',e=>{const r=fab.getBoundingClientRect();arrastre={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,sx:e.clientX,sy:e.clientY,movio:false};fab.setPointerCapture(e.pointerId);e.preventDefault();});
  fab.addEventListener('pointermove',e=>{if(!arrastre||arrastre.id!==e.pointerId)return;if(!arrastre.movio&&Math.hypot(e.clientX-arrastre.sx,e.clientY-arrastre.sy)<5)return;arrastre.movio=true;fab.classList.add('arrastrando');colocar(e.clientX-arrastre.dx,e.clientY-arrastre.dy);});
  fab.addEventListener('pointerup',e=>{if(!arrastre||arrastre.id!==e.pointerId)return;const movio=arrastre.movio;arrastre=null;fab.classList.remove('arrastrando');const r=fab.getBoundingClientRect();colocar(r.left,r.top,true);if(!movio)toggleNexa();});
  addEventListener('resize',()=>{const r=fab.getBoundingClientRect();colocar(r.left,r.top);});
  fab.addEventListener('mouseenter', () => fab.classList.add('saluda'));
  fab.addEventListener('mouseleave', () => fab.classList.remove('saluda'));
  const frases = ['¿Qué revisamos?', 'Estoy lista para ayudarte', 'Revisemos tus pendientes'];
  let i = 0;
  setInterval(() => {
    if(nexaAbierto) return;
    const s = $('#nexaSaludoFab');
    if(s){ i = (i + 1) % frases.length; s.textContent = frases[i]; s.classList.remove('cambia'); void s.offsetWidth; s.classList.add('cambia'); }
  }, 9000);
}
