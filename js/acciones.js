/* ============================================================================
   ACCIONES — todo lo que modifica datos, y los formularios que las alimentan
   Regla: las vistas solo dibujan; cualquier cambio de datos pasa por aquí.
   ========================================================================== */

/* ---- Tareas -------------------------------------------------------------- */

/** Cada cuánto se repite una tarea. Al completarla se crea la siguiente. */
const REPETICIONES = {
  '':          { l:'No se repite',   dias:0  },
  'diaria':    { l:'Cada día',       dias:1  },
  'semanal':   { l:'Cada semana',    dias:7  },
  'quincenal': { l:'Cada 15 días',   dias:15 },
  'mensual':   { l:'Cada mes',       dias:30 }
};

async function toggleTarea(id){
  const t = S.tareas.find(x => x.id === id);
  const completando = t.estado !== 'hecho';

  await db.update('tareas', id, {
    estado: completando ? 'hecho' : 'pendiente',
    completada_el: completando ? hoyISO() : null
  });

  /* Si se repite, al completarla nace la siguiente. Así una tarea semanal
     no hay que volver a escribirla cada lunes. */
  if(completando && t.repite && REPETICIONES[t.repite]){
    const base = t.vence && diasDesde(t.vence) > 0 ? new Date(t.vence + 'T00:00:00') : new Date();
    const prox = dISO(new Date(base.getTime() + REPETICIONES[t.repite].dias * 86400000));
    const { id:_, created_at, updated_at, completada_el, ...resto } = t;
    await db.insert('tareas', { ...resto, estado:'pendiente', vence: prox, completada_el:null });
    render();
    toast(`Hecha ✓ — la próxima queda para ${fechaTxt(prox)}`);
    return;
  }

  render();
  if(completando) toast('Tarea completada ✓');
}

/** Reprograma a una fecha concreta, no solo "mañana". */
async function reprogramar(id, cuando){
  const t = S.tareas.find(x => x.id === id);
  let fecha;

  if(cuando === 'hoy')          fecha = hoyISO();
  else if(cuando === 'manana')  fecha = masDias(1);
  else if(cuando === 'semana')  fecha = masDias(7);
  else if(cuando === 'quitar')  fecha = null;
  else if(cuando === '1d'){
    const base = (t.vence && diasDesde(t.vence) > 0) ? new Date(t.vence + 'T00:00:00') : new Date();
    fecha = dISO(new Date(base.getTime() + 86400000));
  }
  else fecha = cuando;   // una fecha ISO concreta

  await db.update('tareas', id, { vence: fecha });
  render();
  toast(fecha ? `Movida a ${fechaTxt(fecha)}` : 'Sin fecha');
}

/** Atajo de la fila: empujar un día. */
const posponer = id => reprogramar(id, '1d');

function modalFecha(id){
  const t = S.tareas.find(x => x.id === id);
  openModal(formModal('Reprogramar', `
    <p style="font-size:13px;color:var(--text-2)">${esc(t.titulo)}</p>
    <div style="display:flex;gap:7px;flex-wrap:wrap">
      <button class="btn" onclick="closeModal();reprogramar('${id}','hoy')">Hoy</button>
      <button class="btn" onclick="closeModal();reprogramar('${id}','manana')">Mañana</button>
      <button class="btn" onclick="closeModal();reprogramar('${id}','semana')">En una semana</button>
      <button class="btn" onclick="closeModal();reprogramar('${id}','quitar')">Quitar fecha</button>
    </div>
    <div><label>O una fecha concreta</label>
      <input type="date" id="fFecha" value="${t.vence || hoyISO()}"></div>`,
    `closeModal();reprogramar('${id}', document.getElementById('fFecha')?.value || '${hoyISO()}')`,
    'Guardar'));
}

function modalTarea(id = null){
  const t = id ? S.tareas.find(x => x.id === id) : null;

  openModal(formModal(id ? 'Editar tarea' : 'Nueva tarea', `
    <div><label>¿Qué hay que hacer?</label>
      <input id="mT" placeholder="Ej. Enviar informe mensual" value="${esc(t?.titulo || '')}"></div>

    <div class="f2">
      <div><label>Cliente</label><select id="mC">${optsCli(t?.cliente_id)}</select></div>
      <div><label>Prioridad</label><select id="mP">
        ${['alta','media','baja'].map(x =>
          `<option value="${x}" ${(t?.prioridad || 'media') === x ? 'selected' : ''}>${PRI[x].l}</option>`).join('')}
      </select></div>
    </div>

    <div class="f2">
      <div><label>Vence</label>
        <input type="date" id="mV" value="${t?.vence || (id ? '' : hoyISO())}"></div>
      <div><label>Proyecto</label><select id="mPr">
        <option value="">— Ninguno —</option>${optsProy(t?.proyecto_id)}</select></div>
    </div>

    <div><label>Se repite</label>
      <select id="mR">${Object.entries(REPETICIONES).map(([k, v]) =>
        `<option value="${k}" ${(t?.repite || '') === k ? 'selected' : ''}>${v.l}</option>`).join('')}</select>
      <div style="font-size:11.5px;color:var(--text-2);margin-top:5px">
        Al marcarla como hecha se crea sola la siguiente.</div>
    </div>

    <div><label>Notas</label>
      <textarea id="mN" placeholder="Detalles, contactos, lo que no cabe en el título">${esc(t?.notas || '')}</textarea></div>`,
    `guardarTarea(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear tarea'));
}

async function guardarTarea(id = null){
  const titulo = $('#mT').value.trim();
  if(!titulo){ toast('Escribe el título'); return; }

  const fila = {
    titulo,
    cliente_id:  $('#mC').value || null,
    proyecto_id: $('#mPr').value || null,
    prioridad:   $('#mP').value,
    vence:       $('#mV').value || null,
    repite:      $('#mR').value || '',
    notas:       $('#mN').value.trim()
  };
  if(!id) Object.assign(fila, { estado:'pendiente', completada_el:null });

  if(id) await db.update('tareas', id, fila);
  else    await db.insert('tareas', fila);

  closeModal(); render();
  toast(id ? 'Tarea actualizada ✓' : 'Tarea creada ✓');
}

async function duplicarTarea(id){
  const t = S.tareas.find(x => x.id === id);
  const { id:_, created_at, updated_at, ...resto } = t;
  await db.insert('tareas', { ...resto, titulo: t.titulo + ' (copia)',
                              estado:'pendiente', completada_el:null });
  render(); toast('Tarea duplicada');
}

function eliminarTarea(id){
  const t = S.tareas.find(x => x.id === id);
  confirmarPeligro('¿Eliminar esta tarea?',
    `"${t.titulo}"

Esta acción no se puede deshacer.`,
    async () => { await db.remove('tareas', id); render(); toast('Tarea eliminada'); });
}

/* ---- Caja menor: está en js/acciones-caja.js ------------------------------ */

/* ---- Novedades ----------------------------------------------------------- */
async function cerrarNovedad(id){
  await db.update('novedades', id, { estado:'cerrada' });
  render(); toast('Novedad cerrada');
}

/** Convierte una novedad en tarea para hoy: que no se quede en anécdota. */
async function novedadATarea(id){
  const n = S.novedades.find(x => x.id === id);
  await db.insert('tareas', {
    titulo: n.accion || n.titulo, cliente_id:n.cliente_id, proyecto_id:null,
    prioridad:n.criticidad, estado:'pendiente', vence:hoyISO()
  });
  render(); toast('Convertida en tarea para hoy');
}

function modalNovedad(){
  openModal(formModal('Registrar novedad', `
    <div><label>¿Qué pasó?</label>
      <input id="nT" placeholder="Ej. El dashboard no carga los datos"></div>
    <div><label>Detalle</label>
      <textarea id="nD" placeholder="Contexto, quién reportó, desde cuándo…"></textarea></div>
    <div class="f2">
      <div><label>Cliente</label><select id="nC">${optsCli('c1')}</select></div>
      <div><label>Criticidad</label><select id="nK">
        <option value="alta">Alta</option>
        <option value="media" selected>Media</option>
        <option value="baja">Baja</option></select></div>
    </div>
    <div><label>Acción a tomar</label>
      <input id="nA" placeholder="Ej. Revisar permisos del Sheet"></div>`,
    'guardarNovedad()', 'Registrar'));
}

async function guardarNovedad(){
  const titulo = $('#nT').value.trim();
  if(!titulo){ toast('Describe la novedad'); return; }
  await db.insert('novedades', {
    fecha:hoyISO(), titulo, detalle:$('#nD').value.trim(),
    cliente_id:$('#nC').value, criticidad:$('#nK').value,
    estado:'abierta', accion:$('#nA').value.trim()
  });
  closeModal(); render(); toast('Novedad registrada ✓');
}

/* ---- Proyectos ----------------------------------------------------------- */
function modalProyecto(){
  openModal(formModal('Nuevo proyecto', `
    <div><label>Nombre</label>
      <input id="pN" placeholder="Ej. Dashboard de indicadores"></div>
    <div class="f2">
      <div><label>Cliente</label><select id="pC">${optsCli('c1')}</select></div>
      <div><label>Estado</label><select id="pE">
        <option value="propuesta">Propuesta</option>
        <option value="en_curso" selected>En curso</option>
        <option value="en_riesgo">En riesgo</option>
        <option value="hecho">Entregado</option></select></div>
    </div>
    <div class="f2">
      <div><label>Avance (%)</label><input id="pA" type="number" value="0" min="0" max="100"></div>
      <div><label>Fecha de entrega</label><input type="date" id="pV"></div>
    </div>`, 'guardarProyecto()', 'Crear'));
}

async function guardarProyecto(){
  const nombre = $('#pN').value.trim();
  if(!nombre){ toast('Escribe el nombre'); return; }
  await db.insert('proyectos', {
    nombre, cliente_id:$('#pC').value, estado:$('#pE').value,
    avance:+$('#pA').value || 0, vence:$('#pV').value || null
  });
  closeModal(); render(); toast('Proyecto creado ✓');
}

/* ---- Clientes ------------------------------------------------------------ */
function modalCliente(){
  openModal(formModal('Nuevo cliente', `
    <div><label>Nombre</label><input id="cN" placeholder="Ej. Nueva Empresa S.A.S"></div>
    <div class="f2">
      <div><label>Contacto</label><input id="cCo" placeholder="Nombre o cargo"></div>
      <div><label>Color</label><input type="color" id="cCol" value="#2563eb" style="height:38px"></div>
    </div>`, 'guardarCliente()', 'Crear'));
}

async function guardarCliente(){
  const nombre = $('#cN').value.trim();
  if(!nombre){ toast('Escribe el nombre'); return; }
  await db.insert('clientes', {
    nombre, contacto:$('#cCo').value.trim(), color:$('#cCol').value, activo:true
  });
  closeModal(); render(); toast('Cliente creado ✓');
}

/* ---- Accesos rápidos ----------------------------------------------------- */
function modalEnlace(id = null){
  const d = id ? S.dashboards.find(x => x.id === id) : null;
  openModal(formModal(id ? 'Editar enlace' : 'Nuevo enlace', `
    <div><label>Nombre</label>
      <input id="enN" placeholder="Ej. Dashboard institucional Cafam" value="${esc(d?.nombre || '')}"></div>
    <div><label>Dirección web</label>
      <input id="enU" type="url" inputmode="url" placeholder="https://…" value="${esc(d?.url || '')}"></div>
    <div><label>Cliente</label>
      <select id="enC">${optsCli(d?.cliente_id)}</select></div>
    <p style="font-size:11.5px;color:var(--text-2)">
      Pégala tal cual la copias del navegador. Se abrirá en una pestaña nueva.</p>`,
    `guardarEnlace(${id ? `'${id}'` : 'null'})`, id ? 'Guardar' : 'Guardar enlace'));
}

async function guardarEnlace(id = null){
  const nombre = $('#enN').value.trim();
  let url = $('#enU').value.trim();
  if(!nombre){ toast('Ponle un nombre'); return; }
  if(!url){ toast('Falta la dirección web'); return; }
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;   // pegar sin https es lo normal

  const fila = { nombre, url, cliente_id: $('#enC').value || null };
  if(id) await db.update('dashboards', id, fila);
  else    await db.insert('dashboards', fila);

  closeModal(); render(); toast(id ? 'Enlace actualizado ✓' : 'Enlace guardado ✓');
}

/* ---- Rutina diaria ------------------------------------------------------- */
async function toggleRutina(id){
  const r = S.rutina.find(x => x.id === id);
  await db.update('rutina', id, { hecho_el: r.hecho_el === hoyISO() ? null : hoyISO() });
  render();
}

function modalRutina(){
  openModal(formModal('Paso de la rutina diaria', `
    <div><label>¿Qué revisas todos los días?</label>
      <input id="ruT" placeholder="Ej. Revisar novedades de los coordinadores"></div>
    <p style="font-size:11.5px;color:var(--text-2)">
      Se marca cada día y se reinicia solo a la mañana siguiente.</p>`,
    'guardarRutina()', 'Agregar'));
}

async function guardarRutina(){
  const texto = $('#ruT').value.trim();
  if(!texto){ toast('Escribe el paso'); return; }
  await db.insert('rutina', { texto, orden: S.rutina.length + 1, hecho_el:null });
  closeModal(); render(); toast('Paso agregado ✓');
}

/* ---- Genérico ------------------------------------------------------------ */
async function borrar(tabla, id){
  if(!confirm('¿Eliminar este registro?')) return;
  await db.remove(tabla, id);
  render();
}
