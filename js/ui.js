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
  const hecho = t.estado === 'hecho';
  const d = t.vence ? diasDesde(t.vence) : null;
  const p = pro(t.proyecto_id);

  let chipFecha = '';
  if(!hecho && d !== null){
    if(d < 0)       chipFecha = `<span class="chip d">${fechaTxt(t.vence)}</span>`;
    else if(d === 0) chipFecha = `<span class="chip w">Hoy</span>`;
  }

  return `
  <div class="row ${hecho ? 'done' : ''}">
    <button class="chk ${hecho ? 'on' : ''}" onclick="toggleTarea('${t.id}')" title="Marcar">✓</button>
    <div class="row-main">
      <div class="row-t">${esc(t.titulo)}
        ${!hecho && t.prioridad === 'alta' ? '<span class="chip d">Alta</span>' : ''}
        ${chipFecha}
      </div>
      <div class="row-s">
        <span>${cliTag(t.cliente_id)}</span>
        ${p ? `<span>📁 ${esc(p.nombre)}</span>` : ''}
        ${d !== null && d > 0 ? `<span>${fechaTxt(t.vence)}</span>` : ''}
      </div>
    </div>
    <div class="row-act">
      <button class="btn sm" onclick="posponer('${t.id}')" title="Mover a mañana">→ 1d</button>
      <button class="btn sm dgr" onclick="borrar('tareas','${t.id}')" title="Eliminar">✕</button>
    </div>
  </div>`;
}
