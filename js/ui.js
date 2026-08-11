/* ============================================================================
   UI — piezas visuales reutilizables por todas las vistas
   ========================================================================== */

/* ---- Modal --------------------------------------------------------------- */
function openModal(html){
  $('#modal').innerHTML = html;
  $('#mask').classList.add('on');
  setTimeout(() => $('#modal').querySelector('input,select,textarea')?.focus(), 50);
}
function closeModal(){ $('#mask').classList.remove('on'); }

/** Cabecera + pie estándar de un formulario modal. */
function formModal(titulo, cuerpo, onGuardar, textoBoton = 'Guardar'){
  return `
    <div class="modal-h">
      <h3>${esc(titulo)}</h3>
      <button class="btn sm" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-b f">${cuerpo}</div>
    <div class="modal-f">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn pri" onclick="${onGuardar}">${esc(textoBoton)}</button>
    </div>`;
}

/* ---- Panel lateral (drawer) ---------------------------------------------
   Para formularios largos: entra desde el borde y deja ver el contexto detrás.
   -------------------------------------------------------------------------- */
function openDrawer(html){
  let d = $('#drawer');
  if(!d){
    document.body.insertAdjacentHTML('beforeend',
      `<div class="drawer-mask" id="drawerMask" onclick="cerrarDrawer()"></div>
       <div class="drawer" id="drawer"></div>`);
    d = $('#drawer');
  }
  d.innerHTML = html;
  $('#drawerMask').classList.add('on');
  requestAnimationFrame(() => d.classList.add('on'));
  setTimeout(() => d.querySelector('input,textarea,select')?.focus(), 260);
}

function cerrarDrawer(){
  $('#drawer')?.classList.remove('on');
  $('#drawerMask')?.classList.remove('on');
}

/* ---- Confirmación de acciones destructivas ------------------------------- */
let _accionPeligro = null;

/** Diálogo propio, en vez de confirm(): permite explicar la consecuencia. */
function confirmarPeligro(titulo, detalle, alConfirmar, textoBoton = 'Eliminar'){
  _accionPeligro = alConfirmar;
  openModal(`
    <div class="modal-h"><h3>${esc(titulo)}</h3>
      <button class="btn sm" onclick="closeModal()">✕</button></div>
    <div class="modal-b">
      <p style="font-size:13.5px;color:var(--text-2);white-space:pre-line">${esc(detalle)}</p>
    </div>
    <div class="modal-f">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn peligro" onclick="ejecutarPeligro()">${esc(textoBoton)}</button>
    </div>`);
}

async function ejecutarPeligro(){
  const fn = _accionPeligro;
  _accionPeligro = null;
  closeModal();
  if(fn) await fn();
}

/* ---- Menú de acciones (⋮) ------------------------------------------------ */
/** @param acciones  [[etiqueta, llamada, 'peligro'?], …] */
function menuAcciones(acciones){
  const items = acciones.map(([l, fn, tono]) =>
    `<button class="pop-item ${tono || ''}" onclick="cerrarPop();${fn}">${esc(l)}</button>`).join('');
  return `<div class="pop-wrap">
    <button class="pop-btn" onclick="abrirPop(this)" aria-label="Acciones">⋮</button>
    <div class="pop">${items}</div>
  </div>`;
}

function abrirPop(btn){
  const pop = btn.nextElementSibling;
  const yaAbierto = pop.classList.contains('on');
  cerrarPop();
  if(!yaAbierto){
    pop.classList.add('on');
    // Si no cabe abajo, se abre hacia arriba
    const r = pop.getBoundingClientRect();
    if(r.bottom > innerHeight - 8) pop.classList.add('arriba');
  }
}
const cerrarPop = () => $$('.pop.on').forEach(p => p.classList.remove('on', 'arriba'));
document.addEventListener('click', e => { if(!e.target.closest('.pop-wrap')) cerrarPop(); });

/* ---- Fragmentos comunes -------------------------------------------------- */

/** Punto de color del cliente + su nombre. */
const cliTag = id => {
  const c = cli(id);
  return `<span class="dot dot-i" style="background:${c.color}"></span>${esc(c.nombre)}`;
};

/** <option> de todos los clientes, con uno preseleccionado. */
const optsCli = sel => `<option value="">— Sin cliente —</option>` + S.clientes
  .map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`)
  .join('');

/** <option> de proyectos abiertos. */
const optsProy = sel => S.proyectos.filter(p => p.estado !== 'hecho')
  .map(p => `<option value="${p.id}" ${sel === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`)
  .join('');

/** Color semántico según criticidad/prioridad. */
const colorNivel = n => n === 'alta'  ? 'var(--danger)'
                      : n === 'media' ? 'var(--warn)'
                      : 'var(--text-3)';

/** Bloque de "no hay nada aquí". */
const vacio = (emoji, texto) => `<div class="empty"><span class="em">${emoji}</span>${esc(texto)}</div>`;

/** Estado vacío grande, con botón para crear el primer registro. */
const vacioCTA = (emoji, titulo, sub, btn, accion) => `
  <div class="card" style="max-width:560px">
    <div class="card-b" style="text-align:center;padding:34px 22px">
      <div style="font-size:34px;opacity:.5;margin-bottom:10px">${emoji}</div>
      <h2 style="font-size:16px;margin-bottom:6px">${esc(titulo)}</h2>
      <p style="color:var(--text-2);font-size:13px;margin-bottom:16px">${esc(sub)}</p>
      <button class="btn pri" onclick="${accion}">${esc(btn)}</button>
    </div>
  </div>`;

/** Barra de progreso. */
const barra = (porcentaje, color = 'var(--brand)') =>
  `<div class="bar"><span style="width:${Math.min(100, Math.max(0, porcentaje))}%;background:${color}"></span></div>`;

/** Tarjeta KPI. `tono`: '' | 'd' | 'w' | 'o' | 'p' */
const kpi = (etiqueta, valor, sub, tono = '') => `
  <div class="kpi ${tono}">
    <div class="kpi-lbl">${esc(etiqueta)}</div>
    <div class="kpi-val">${valor}</div>
    <div class="kpi-sub">${esc(sub)}</div>
  </div>`;

/** Cabecera de página con título, subtítulo y acciones a la derecha. */
const pageHead = (titulo, sub, acciones = '') => `
  <div class="page-head">
    <div><h1>${titulo}</h1><p>${sub}</p></div>
    <div style="display:flex;gap:8px">${acciones}</div>
  </div>`;

/* ---- Fila de tarea (se usa en Inicio y en Tareas) ------------------------- */
function rowTarea(t){
  const hecho     = t.estado === 'hecho';
  const cancelada = t.estado === 'cancelada';
  const cerrada   = hecho || cancelada;
  const d = t.vence ? diasDesde(t.vence) : null;
  const p = pro(t.proyecto_id);
  const persona = colab(t.persona_id);
  const est = ESTADOS_TAREA[t.estado] || ESTADOS_TAREA.pendiente;

  let chipFecha = '';
  if(!cerrada && d !== null){
    if(d < 0)        chipFecha = `<span class="chip d">${fechaTxt(t.vence)}</span>`;
    else if(d === 0) chipFecha = `<span class="chip w">Hoy${t.hora ? ' ' + esc(t.hora) : ''}</span>`;
  }

  // Progreso del checklist: 2/4 dice más que un icono
  const chk = t.checklist || [];
  const chkOk = chk.filter(x => x.ok).length;

  const esperaAtrasada = t.estado === 'en_espera' && t.espera_fecha && diasDesde(t.espera_fecha) < 0;

  return `
  <div class="row ${cerrada ? 'done' : ''}">
    <button class="chk ${hecho ? 'on' : ''}" onclick="toggleTarea('${t.id}')"
            title="${hecho ? 'Reabrir' : 'Marcar como hecha'}">✓</button>

    <div class="row-main" style="cursor:pointer" onclick="verTarea('${t.id}')">
      <div class="row-t">${esc(t.titulo)}
        ${t.estado === 'en_proceso' || t.estado === 'en_espera' || cancelada
          ? `<span class="chip ${est.c}">${est.l}</span>` : ''}
        ${!cerrada && t.prioridad === 'alta' ? '<span class="chip d">Alta</span>' : ''}
        ${chipFecha}
        ${chk.length ? `<span class="chip ${chkOk === chk.length ? 'o' : 'n'}">☑ ${chkOk}/${chk.length}</span>` : ''}
        ${(t.adjuntos || []).length ? `<span class="chip n" title="${(t.adjuntos || []).length} adjunto(s)">📎 ${(t.adjuntos || []).length}</span>` : ''}
        ${(t.seguimiento || []).length ? `<span class="chip n" title="${(t.seguimiento || []).length} anotación(es)">💬 ${(t.seguimiento || []).length}</span>` : ''}
        ${t.repite ? `<span class="chip n" title="${esc(REPETICIONES[t.repite]?.l || '')}">🔁</span>` : ''}
      </div>
      <div class="row-s">
        ${t.tipo ? `<span>${esc(t.tipo)}</span>` : ''}
        ${persona ? `<span>👤 ${esc(persona.nombre)}${persona.cargo ? ' · ' + esc(persona.cargo) : ''}</span>` : ''}
        ${t.cliente_id ? `<span>${cliTag(t.cliente_id)}</span>` : ''}
        ${p ? `<span>📁 ${esc(p.nombre)}</span>` : ''}
        ${d !== null && d > 0 ? `<span>${fechaTxt(t.vence)}${t.hora ? ' · ' + esc(t.hora) : ''}</span>` : ''}
        ${!cerrada && d === null ? '<span>Sin fecha</span>' : ''}
        ${hecho && t.completada_el ? `<span>Hecha ${fechaTxt(t.completada_el)}</span>` : ''}
        ${t.notas ? `<span title="${esc(t.notas)}">📝 ${esc(t.notas.slice(0, 40))}${t.notas.length > 40 ? '…' : ''}</span>` : ''}
      </div>
      ${t.estado === 'en_espera' && (t.espera_que || t.espera_fecha) ? `
        <div class="row-s" style="color:${esperaAtrasada ? 'var(--danger)' : 'var(--warn)'};margin-top:3px">
          <span>⏳ ${esc(t.espera_que || 'En espera')}${t.espera_fecha
            ? ` · esperado ${fechaTxt(t.espera_fecha)}${esperaAtrasada ? ' — ¡vuelve a cobrar!' : ''}` : ''}</span>
        </div>` : ''}
      ${hecho && t.resultado ? `
        <div class="row-s" style="margin-top:3px"><span>✎ ${esc(t.resultado.slice(0, 60))}${t.resultado.length > 60 ? '…' : ''}</span></div>` : ''}
    </div>

    <button class="btn sm row-rapida" onclick="modalTarea('${t.id}')"
            title="Editar los datos">✎</button>
    ${cerrada ? '' : `<button class="btn sm row-rapida" onclick="posponer('${t.id}')"
                            title="Empujar un día">→ 1d</button>`}
    ${menuAcciones([
      ['Abrir',            `verTarea('${t.id}')`],
      ['Editar datos',     `modalTarea('${t.id}')`],
      ['Reprogramar',      `modalFecha('${t.id}')`],
      ['Duplicar',         `duplicarTarea('${t.id}')`],
      [hecho ? 'Reabrir' : 'Marcar hecha', `toggleTarea('${t.id}')`],
      ['Eliminar',         `eliminarTarea('${t.id}')`, 'peligro']
    ])}
  </div>`;
}
