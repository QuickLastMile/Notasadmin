/* ============================================================================
   NEXA — interfaz y consultas seguras del asistente.
   - Sin Edge Function: responde únicamente con datos locales ya cargados.
   - Con Edge Function: consulta la IA con el usuario autenticado.
   NEXA nunca modifica registros desde este archivo.
   ========================================================================== */

const NEXA_KEY = () => `nexa_chat_v1_${usuario?.id || 'local'}`;
let nexaAbierto = false;
let nexaHistorial = [];

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
    <div class="nexa-chat-head">
      <img src="assets/nexa-bot/03_avatar_perfil.png" alt="NEXA">
      <div><strong>NEXA</strong><small>Tu asistente inteligente</small></div>
      <span class="nexa-estado" id="nexaEstado">🟢 Disponible</span>
      <button class="nexa-cerrar" type="button" onclick="toggleNexa()" aria-label="Cerrar NEXA">×</button>
    </div>
    <div class="nexa-mensajes" id="nexaMensajes">
      ${nexaHistorial.map(m => `<div class="nexa-msg ${m.rol === 'user' ? 'user' : 'bot'}">${nexaTextoSeguro(m.texto)}</div>`).join('')}
    </div>
    <div class="nexa-sugerencias">
      <button type="button" onclick="nexaPreguntar('¿Qué tareas están vencidas?')">Tareas vencidas</button>
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
function nexaEstado(texto){ const e = $('#nexaEstado'); if(e) e.textContent = texto; }

function nexaResponderLocal(mensaje){
  const q = mensaje.toLowerCase();
  const m = metricas();
  if(/vencid|atrasad/.test(q)){
    const titulos = m.vencidas.slice(0, 4).map(t => `• ${t.titulo}${t.vence ? ` (${fechaTxt(t.vence)})` : ''}`);
    return m.vencidas.length ? `🚨 Hay ${m.vencidas.length} tarea(s) vencida(s).\n${titulos.join('\n')}${m.vencidas.length > 4 ? '\n• …' : ''}\n\nRecomendación: prioriza las de mayor impacto y reprograma las que dependan de terceros.` : '✅ No encontré tareas vencidas. Tienes ' + m.hoy.length + ' tarea(s) para hoy.';
  }
  if(/caja|pago|factura|soporte|reembolso|legaliz/.test(q)){
    if(!m.periodo) return 'No hay un período de caja abierto todavía. Puedes crearlo desde Caja menor.';
    const a = m.arqueo;
    return `💵 Caja: ${m.periodo.nombre}\nGastado: ${cop(a.gastado)} · Saldo: ${cop(a.saldo)}\nSin legalizar: ${a.sinLegalizar.length} · Sin soporte: ${a.sinSoporte.length}\nPendiente de reembolso: ${cop(a.pendiente)}${a.sinSoporte.length ? '\n\n⚠️ Conviene completar los soportes antes de legalizar.' : ''}`;
  }
  if(/novedad|incidente|alerta/.test(q)){
    return `⚠️ Hay ${m.novAbiertas.length} novedad(es) abierta(s), de las cuales ${m.novCriticas.length} son críticas y ${m.novEstancadas.length} llevan más de 7 días sin cerrar.${m.novCriticas.length ? '\n\nRecomendación: revisa primero las críticas y asigna responsable o siguiente acción.' : ''}`;
  }
  if(/proyecto|avance|riesgo/.test(q)){
    const nombres = m.proyRiesgo.slice(0,3).map(p => `• ${p.nombre}`);
    return `📁 Hay ${m.proyActivos.length} proyecto(s) activo(s) y ${m.proyRiesgo.length} en riesgo o cerca de vencerse.${nombres.length ? `\n${nombres.join('\n')}` : '\n✅ No detecté proyectos en riesgo por fecha.'}`;
  }
  if(/hola|buenas|qué puedes|que puedes|ayuda/.test(q)) return 'Puedo analizar la información que ya tienes cargada: tareas vencidas, caja menor, soportes, novedades abiertas y riesgos de proyectos. También puedo explicarte cada módulo.\n\nPrueba: “¿qué tareas están vencidas?”';
  return 'Con los datos disponibles no puedo responder eso con certeza todavía. Puedo revisar tareas, caja, novedades y proyectos. Cuando actives la conexión de IA, también podré interpretar consultas más abiertas.';
}

async function nexaIA(mensaje){
  if(!NUBE || !sb) return null;
  const { data, error } = await sb.functions.invoke(CFG.nexa.functionName, { body:{ mensaje } });
  if(error) return null; // La interfaz sigue siendo útil antes del despliegue de la función.
  return data?.respuesta || null;
}

async function nexaPreguntar(mensaje){
  if(!mensaje?.trim()) return;
  nexaHistorial.push({rol:'user', texto:mensaje.trim()});
  renderNexa();
  nexaEstado('💭 Analizando…');
  const local = nexaResponderLocal(mensaje);
  let respuesta = null;
  try { respuesta = await nexaIA(mensaje); } catch { respuesta = null; }
  nexaHistorial.push({rol:'bot', texto:respuesta || local});
  nexaGuardarHistorial();
  renderNexa();
  nexaEstado(respuesta ? '🟢 Disponible' : '💡 Consulta local');
}

function nexaEnviar(e){
  e.preventDefault();
  const input = $('#nexaInput');
  const mensaje = input?.value || '';
  if(input) input.value = '';
  nexaPreguntar(mensaje);
}

function iniciarNexa(){ nexaCargarHistorial(); }
