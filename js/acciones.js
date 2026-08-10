/* ============================================================================
   ACCIONES — todo lo que modifica datos, y los formularios que las alimentan
   Regla: las vistas solo dibujan; cualquier cambio de datos pasa por aquí.
   ========================================================================== */

/* ---- Tareas -------------------------------------------------------------- */
async function toggleTarea(id){
  const t = S.tareas.find(x => x.id === id);
  const nuevo = t.estado === 'hecho' ? 'pendiente' : 'hecho';
  await db.update('tareas', id, { estado: nuevo });
  render();
  if(nuevo === 'hecho') toast('Tarea completada ✓');
}

async function posponer(id){
  const t = S.tareas.find(x => x.id === id);
  const base = (t.vence && diasDesde(t.vence) > 0) ? new Date(t.vence + 'T00:00:00') : new Date();
  await db.update('tareas', id, { vence: dISO(new Date(base.getTime() + 86400000)) });
  render();
  toast('Movida a mañana');
}

function modalTarea(){
  openModal(formModal('Nueva tarea', `
    <div><label>¿Qué hay que hacer?</label>
      <input id="mT" placeholder="Ej. Enviar informe mensual"></div>
    <div class="f2">
      <div><label>Cliente</label><select id="mC">${optsCli('c5')}</select></div>
      <div><label>Prioridad</label><select id="mP">
        <option value="alta">Alta</option>
        <option value="media" selected>Media</option>
        <option value="baja">Baja</option></select></div>
    </div>
    <div class="f2">
      <div><label>Vence</label><input type="date" id="mV" value="${hoyISO()}"></div>
      <div><label>Proyecto</label><select id="mPr">
        <option value="">— Ninguno —</option>${optsProy()}</select></div>
    </div>`, 'guardarTarea()'));
}

async function guardarTarea(){
  const titulo = $('#mT').value.trim();
  if(!titulo){ toast('Escribe el título'); return; }
  await db.insert('tareas', {
    titulo, cliente_id:$('#mC').value, proyecto_id:$('#mPr').value || null,
    prioridad:$('#mP').value, estado:'pendiente', vence:$('#mV').value
  });
  closeModal(); render(); toast('Tarea creada ✓');
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

/* ---- Rutina diaria ------------------------------------------------------- */
async function toggleRutina(id){
  const r = S.rutina.find(x => x.id === id);
  await db.update('rutina', id, { hecho_el: r.hecho_el === hoyISO() ? null : hoyISO() });
  render();
}

/* ---- Genérico ------------------------------------------------------------ */
async function borrar(tabla, id){
  if(!confirm('¿Eliminar este registro?')) return;
  await db.remove(tabla, id);
  render();
}
