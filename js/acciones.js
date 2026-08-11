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
    await db.insert('tareas', { ...resto, estado:'pendiente', vence: prox, completada_el:null,
      resultado:'', seguimiento:[], adjuntos:[],
      checklist:(t.checklist || []).map(p => ({ ...p, ok:false })) });
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

function modalTarea(id = null, proyectoPreset = null){
  const t = id ? S.tareas.find(x => x.id === id) : null;
  const pp = !t && proyectoPreset ? pro(proyectoPreset) : null;
  const estado = t?.estado || 'pendiente';

  openModal(formModal(id ? 'Editar tarea' : 'Nueva tarea', `
    <div><label>¿Qué hay que hacer?</label>
      <input id="mT" placeholder="Ej. Enviar informe mensual" value="${esc(t?.titulo || '')}"></div>

    <div class="f2">
      <div><label>Estado</label><select id="mE" onchange="mostrarEspera()">
        ${Object.entries(ESTADOS_TAREA).map(([k, v]) =>
          `<option value="${k}" ${estado === k ? 'selected' : ''}>${v.l}</option>`).join('')}
      </select></div>
      <div><label>Prioridad</label><select id="mP">
        ${['alta','media','baja'].map(x =>
          `<option value="${x}" ${(t?.prioridad || 'media') === x ? 'selected' : ''}>${PRI[x].l}</option>`).join('')}
      </select></div>
    </div>

    <div class="f2">
      <div><label>Vence</label>
        <input type="date" id="mV" value="${t?.vence || (id ? '' : hoyISO())}"></div>
      <div><label>Hora límite</label>
        <input type="time" id="mH" value="${esc(t?.hora || '')}"></div>
    </div>

    <div class="f2">
      <div><label>Tipo</label><select id="mTipo">
        <option value="">— Sin tipo —</option>
        ${lista('tipo_tarea').map(x =>
          `<option ${(t?.tipo || '') === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
      </select></div>
      <div><label>Se repite</label><select id="mR">
        ${Object.entries(REPETICIONES).map(([k, v]) =>
          `<option value="${k}" ${(t?.repite || '') === k ? 'selected' : ''}>${v.l}</option>`).join('')}
      </select></div>
    </div>

    <!-- Contexto: todo opcional. La pregunta es qué hay que hacer,
         no a qué cliente pertenece. -->
    <div><label>Persona relacionada (opcional)</label>
      <select id="mPersona" onchange="sincronizarPersona()">
        <option value="">— Ninguna —</option>
        ${S.colaboradores.filter(c => c.activo !== false).map(c =>
          `<option value="${c.id}" ${t?.persona_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
      </select>
      <div id="mPersonaInfo" style="font-size:11.5px;color:var(--text-2);margin-top:5px"></div>
    </div>

    <div class="f2">
      <div><label>Cliente (opcional)</label><select id="mC" onchange="sincronizarCeco()">${optsCli(t?.cliente_id || pp?.cliente_id)}</select>
        <div id="mCecoInfo" style="font-size:11.5px;color:var(--text-2);margin-top:5px"></div></div>
      <div><label>Proyecto</label><select id="mPr">
        <option value="">— Ninguno —</option>${optsProy(t?.proyecto_id || pp?.id)}</select></div>
    </div>

    <!-- Solo aparece cuando el estado es "En espera" -->
    <div id="mEsperaBox" style="display:none;border:1px dashed var(--warn);border-radius:12px;
         padding:13px;background:var(--warn-soft)">
      <div><label>¿Qué estoy esperando?</label>
        <input id="mEsQue" placeholder="Ej. La cuenta de cobro del recorrido"
               value="${esc(t?.espera_que || '')}"></div>
      <div style="margin-top:11px"><label>Lo espero para</label>
        <input type="date" id="mEsFecha" value="${t?.espera_fecha || ''}"></div>
      <p style="font-size:11.5px;color:var(--text-2);margin-top:8px">
        Si esa fecha pasa y sigue en espera, la app te avisa que toca volver a cobrar.</p>
    </div>

    <!-- Checklist: pasos dentro de la misma tarea -->
    <div id="mChkBox">
      <label>Checklist (opcional)</label>
      <div id="mChkLista" style="display:grid;gap:7px"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="mChkNuevo" placeholder="Agregar paso…" style="flex:1"
               onkeydown="if(event.key==='Enter'){event.preventDefault();agregarChk();}">
        <button type="button" class="btn sm" onclick="agregarChk()">+ Paso</button>
      </div>
    </div>

    <div><label>Notas</label>
      <textarea id="mN" placeholder="Detalles, contactos, lo que no cabe en el título">${esc(t?.notas || '')}</textarea></div>

    ${id ? `<div><label>Resultado / comentario al cerrar</label>
      <textarea id="mRes" placeholder="Cómo quedó, qué se decidió…">${esc(t?.resultado || '')}</textarea></div>` : ''}`,
    `guardarTarea(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear tarea'));

  _chk = (t?.checklist || []).map(x => ({ ...x }));
  pintarChk();
  sincronizarPersona(true);
  sincronizarCeco();
  mostrarEspera();
}

/* La sección de espera solo estorba si el estado es otro. */
function mostrarEspera(){
  const box = $('#mEsperaBox');
  if(box) box.style.display = $('#mE').value === 'en_espera' ? 'block' : 'none';
}

/** Al elegir persona: muestra cargo y datos, y hereda su cliente si falta. */
function sincronizarPersona(inicial = false){
  const sel = $('#mPersona'), info = $('#mPersonaInfo');
  if(!sel || !info) return;
  const c = colab(sel.value);
  if(!c){ info.textContent = ''; return; }
  const partes = [c.cargo, c.cliente_id ? cli(c.cliente_id).nombre : null,
                  c.celular, c.correo].filter(Boolean);
  info.innerHTML = '👤 ' + partes.map(esc).join(' · ');
  if(!inicial && c.cliente_id && !$('#mC').value){
    $('#mC').value = c.cliente_id;
    sincronizarCeco();
  }
}

/** El CECO sale solo del cliente elegido: no se duplica a mano. */
function sincronizarCeco(){
  const sel = $('#mC'), info = $('#mCecoInfo');
  if(!sel || !info) return;
  const c = S.clientes.find(x => x.id === sel.value);
  info.textContent = c?.ceco ? `CECO ${c.ceco}` : '';
}

/* ---- Checklist de la tarea ---- */
let _chk = [];

function pintarChk(){
  const box = $('#mChkLista');
  if(!box) return;
  box.innerHTML = _chk.map((p, i) => `
    <div style="display:flex;gap:9px;align-items:center">
      <button type="button" class="chk ${p.ok ? 'on' : ''}" onclick="_chk[${i}].ok=!_chk[${i}].ok;pintarChk()">✓</button>
      <input value="${esc(p.t)}" style="flex:1" oninput="_chk[${i}].t=this.value">
      <button type="button" class="btn sm dgr" onclick="_chk.splice(${i},1);pintarChk()">✕</button>
    </div>`).join('');
}

function agregarChk(){
  const inp = $('#mChkNuevo');
  const v = inp.value.trim();
  if(!v) return;
  _chk.push({ t:v, ok:false });
  inp.value = '';
  pintarChk();
  inp.focus();
}

async function guardarTarea(id = null){
  const titulo = $('#mT').value.trim();
  if(!titulo){ toast('Escribe el título'); return; }

  const estado = $('#mE').value;
  const fila = {
    titulo,
    estado,
    cliente_id:  $('#mC').value || null,
    proyecto_id: $('#mPr').value || null,
    persona_id:  $('#mPersona').value || null,
    prioridad:   $('#mP').value,
    tipo:        $('#mTipo').value || '',
    vence:       $('#mV').value || null,
    hora:        $('#mH').value || '',
    repite:      $('#mR').value || '',
    espera_que:   estado === 'en_espera' ? $('#mEsQue').value.trim() : '',
    espera_fecha: estado === 'en_espera' ? ($('#mEsFecha').value || null) : null,
    checklist:   _chk.filter(p => p.t.trim()),
    notas:       $('#mN').value.trim()
  };
  if($('#mRes')) fila.resultado = $('#mRes').value.trim();
  if(!id) Object.assign(fila, { completada_el: estado === 'hecho' ? hoyISO() : null,
                               resultado:'', seguimiento:[], adjuntos:[] });

  if(id) await db.update('tareas', id, fila);
  else    await db.insert('tareas', fila);

  closeModal(); render();
  toast(id ? 'Tarea actualizada ✓' : 'Tarea creada ✓');
}

async function duplicarTarea(id){
  const t = S.tareas.find(x => x.id === id);
  const { id:_, created_at, updated_at, ...resto } = t;
  // La copia arranca limpia: el seguimiento y los adjuntos son de la original
  await db.insert('tareas', { ...resto, titulo: t.titulo + ' (copia)',
                              estado:'pendiente', completada_el:null,
                              resultado:'', seguimiento:[], adjuntos:[],
                              checklist:(t.checklist || []).map(p => ({ ...p, ok:false })) });
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

/* ---- Novedades: la ficha y el cierre están en js/ficha-novedad.js ------- */

function modalNovedad(id = null){
  const n = id ? S.novedades.find(x => x.id === id) : null;

  openModal(formModal(id ? 'Editar novedad' : 'Registrar novedad', `
    <div><label>¿Qué pasó?</label>
      <input id="nT" placeholder="Ej. La moto 3 no salió a ruta"
             value="${esc(n?.titulo || '')}"></div>

    <div><label>Detalle</label>
      <textarea id="nD" placeholder="Contexto: desde cuándo, a qué hora, qué se vio">${esc(n?.detalle || '')}</textarea></div>

    <div class="f2">
      <div><label>Fecha en que ocurrió</label>
        <input type="date" id="nF" value="${n?.fecha || hoyISO()}"></div>
      <div><label>Criticidad</label><select id="nK">
        ${['alta','media','baja'].map(x =>
          `<option value="${x}" ${(n?.criticidad || 'media') === x ? 'selected' : ''}>${PRI[x].l}</option>`).join('')}
      </select></div>
    </div>

    <div class="f2">
      <div><label>Tipo</label><select id="nTipo">
        <option value="">— Sin tipo —</option>
        ${lista('categoria_novedad').map(x =>
          `<option ${(n?.tipo || '') === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
      </select></div>
      <div><label>Estado</label><select id="nE">
        ${Object.entries(ESTADOS_NOVEDAD).map(([k, v]) =>
          `<option value="${k}" ${(n?.estado || 'abierta') === k ? 'selected' : ''}>${v.ico} ${v.l}</option>`).join('')}
      </select></div>
    </div>

    <div><label>Cliente (opcional)</label>
      <select id="nC">${optsCli(n?.cliente_id)}</select></div>

    <div class="f2">
      <div><label>Persona del cliente</label>
        <select id="nPersona"><option value="">— Ninguna —</option>
          ${S.colaboradores.filter(c => c.activo !== false).map(c =>
            `<option value="${c.id}" ${n?.persona_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
        </select></div>
      <div><label>Mensajero involucrado</label>
        <select id="nBen"><option value="">— Ninguno —</option>
          ${S.beneficiarios.filter(b => b.activo).map(b =>
            `<option value="${b.id}" ${n?.beneficiario_id === b.id ? 'selected' : ''}>${esc(b.nombre)}</option>`).join('')}
        </select></div>
    </div>

    <div><label>¿Quién la reportó?</label>
      <input id="nRep" placeholder="Ej. El coordinador de zona, o yo misma"
             value="${esc(n?.reportado_por || '')}"></div>

    <div><label>Acción a tomar</label>
      <input id="nA" placeholder="Ej. Revisar permisos del Sheet" value="${esc(n?.accion || '')}"></div>`,
    `guardarNovedad(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Registrar'));
}

async function guardarNovedad(id = null){
  const titulo = $('#nT').value.trim();
  if(!titulo){ toast('Describe la novedad'); return; }

  const estado = $('#nE').value;
  const fila = {
    titulo,
    fecha:      $('#nF').value,
    detalle:    $('#nD').value.trim(),
    tipo:       $('#nTipo').value || '',
    criticidad: $('#nK').value,
    estado,
    cliente_id: $('#nC').value || null,
    persona_id: $('#nPersona').value || null,
    beneficiario_id: $('#nBen').value || null,
    reportado_por:   $('#nRep').value.trim(),
    accion:     $('#nA').value.trim()
  };

  // Al cerrarla desde el formulario se marca la fecha; al reabrirla se limpia
  if(id){
    const anterior = S.novedades.find(x => x.id === id);
    if(estado === 'cerrada' && anterior.estado !== 'cerrada') fila.cerrada_el = hoyISO();
    if(estado !== 'cerrada') fila.cerrada_el = null;
  } else {
    Object.assign(fila, { cerrada_el: estado === 'cerrada' ? hoyISO() : null,
                          solucion:'', seguimiento:[], evidencias:[] });
  }

  if(id) await db.update('novedades', id, fila);
  else    await db.insert('novedades', fila);

  closeModal(); render();
  toast(id ? 'Novedad actualizada ✓' : 'Novedad registrada ✓');
}

/** Convierte una novedad en tarea para hoy: que no se quede en anécdota. */
async function novedadATarea(id){
  const n = S.novedades.find(x => x.id === id);
  await db.insert('tareas', {
    titulo: n.accion || n.titulo,
    cliente_id: n.cliente_id, proyecto_id: null, persona_id: n.persona_id || null,
    prioridad: n.criticidad, estado:'pendiente', vence: hoyISO(),
    tipo:'Seguimiento', hora:'', repite:'',
    espera_que:'', espera_fecha:null, checklist:[], seguimiento:[], adjuntos:[],
    notas: `Viene de la novedad: ${n.titulo}`, resultado:'', completada_el:null
  });
  // Registrarlo en el seguimiento de la novedad deja el rastro de qué se hizo
  await db.update('novedades', id, {
    estado: n.estado === 'abierta' ? 'en_gestion' : n.estado,
    seguimiento: [...(n.seguimiento || []),
                  { fecha: hoyISO(), texto: 'Se creó una tarea para gestionarla' }]
  });
  render(); toast('Convertida en tarea para hoy ✓');
}

/* ---- Proyectos ----------------------------------------------------------- */
function modalProyecto(id = null){
  const p = id ? S.proyectos.find(x => x.id === id) : null;
  const modo = p?.avance_modo || 'automatico';
  openModal(formModal(id ? 'Editar proyecto' : 'Nuevo proyecto', `
    <div><label>Nombre</label>
      <input id="pN" placeholder="Ej. Dashboard de indicadores" value="${esc(p?.nombre || '')}"></div>
    <div class="f2">
      <div><label>Cliente</label><select id="pC">${optsCli(p?.cliente_id)}</select></div>
      <div><label>Estado</label><select id="pE">
        ${Object.entries(EST_PROYECTO).map(([k,v]) => `<option value="${k}" ${(p?.estado || 'en_curso') === k ? 'selected' : ''}>${v.l}</option>`).join('')}
      </select></div>
    </div>
    <div class="f2">
      <div><label>Responsable</label><select id="pR"><option value="">— Sin responsable —</option>
        ${S.colaboradores.filter(c => c.activo !== false).map(c => `<option value="${c.id}" ${p?.responsable_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div>
      <div><label>Fecha de entrega</label><input type="date" id="pV" value="${p?.vence || ''}"></div>
    </div>
    <div class="f2">
      <div><label>Cómo calcular el avance</label><select id="pModo" onchange="pintarAvanceProyecto()">
        <option value="automatico" ${modo === 'automatico' ? 'selected' : ''}>Automático según tareas</option>
        <option value="manual" ${modo === 'manual' ? 'selected' : ''}>Manual</option></select></div>
      <div id="pAvanceBox"><label>Avance manual (%)</label>
        <input id="pA" type="number" value="${p?.avance || 0}" min="0" max="100"></div>
    </div>
    <div><label>Objetivo / resultado esperado</label>
      <textarea id="pNotas" placeholder="Qué debe quedar entregado y cómo sabremos que terminó">${esc(p?.notas || '')}</textarea></div>
    <div class="f2">
      <div><label>Repositorio (opcional)</label><input type="url" id="pRepo" placeholder="https://github.com/…" value="${esc(p?.repositorio_url || '')}"></div>
      <div><label>Base de trabajo (opcional)</label><input type="url" id="pBase" placeholder="https://docs.google.com/…" value="${esc(p?.base_url || '')}"></div>
    </div>`, `guardarProyecto(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear'));
  pintarAvanceProyecto();
}

function pintarAvanceProyecto(){
  const box = $('#pAvanceBox');
  if(box) box.style.display = $('#pModo')?.value === 'manual' ? 'block' : 'none';
}

const urlProyectoValida = v => !v || /^https?:\/\/[^\s]+$/i.test(v);

async function guardarProyecto(id = null){
  const nombre = $('#pN').value.trim();
  if(!nombre){ toast('Escribe el nombre'); return; }
  const repositorio_url = $('#pRepo').value.trim();
  const base_url = $('#pBase').value.trim();
  if(!urlProyectoValida(repositorio_url) || !urlProyectoValida(base_url)){
    toast('Los enlaces deben comenzar por http:// o https://'); return;
  }
  const fila = {
    nombre, cliente_id:$('#pC').value || null, estado:$('#pE').value,
    responsable_id:$('#pR').value || null, vence:$('#pV').value || null,
    avance_modo:$('#pModo').value, avance:+$('#pA').value || 0,
    notas:$('#pNotas').value.trim(), repositorio_url, base_url
  };
  if(id) await db.update('proyectos', id, fila);
  else await db.insert('proyectos', { ...fila, seguimiento:[] });
  closeModal(); render(); toast(id ? 'Proyecto actualizado ✓' : 'Proyecto creado ✓');
}

/* ---- Clientes ------------------------------------------------------------ */
function modalCliente(id = null){
  const c = id ? S.clientes.find(x => x.id === id) : null;
  openModal(formModal(id ? 'Editar cliente' : 'Nuevo cliente', `
    <div><label>Nombre</label>
      <input id="cN" placeholder="Ej. Nueva Empresa S.A.S" value="${esc(c?.nombre || '')}"></div>
    <div class="f2">
      <div><label>NIT (opcional)</label>
        <input id="cNit" placeholder="900123456-1" value="${esc(c?.nit || '')}"></div>
      <div><label>CECO</label>
        <input id="cCeco" placeholder="Ej. CAF-1001" value="${esc(c?.ceco || '')}"></div>
    </div>
    <div class="f2">
      <div><label>Contacto</label>
        <input id="cCo" placeholder="Nombre o cargo" value="${esc(c?.contacto || '')}"></div>
      <div><label>Color</label>
        <input type="color" id="cCol" value="${c?.color || '#800000'}" style="height:42px"></div>
    </div>
    <div><label>Estado</label><select id="cAct">
      <option value="1" ${c?.activo !== false ? 'selected' : ''}>Activo</option>
      <option value="0" ${c?.activo === false ? 'selected' : ''}>Inactivo</option>
    </select></div>
    <div><label>Notas</label>
      <textarea id="cNotas" placeholder="Acuerdos, particularidades…">${esc(c?.notas || '')}</textarea></div>`,
    `guardarCliente(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear'));
}

async function guardarCliente(id = null){
  const nombre = $('#cN').value.trim();
  if(!nombre){ toast('Escribe el nombre'); return; }

  const fila = {
    nombre,
    nit:      $('#cNit').value.trim(),
    ceco:     $('#cCeco').value.trim(),
    contacto: $('#cCo').value.trim(),
    color:    $('#cCol').value,
    activo:   $('#cAct').value === '1',
    notas:    $('#cNotas').value.trim()
  };

  if(id) await db.update('clientes', id, fila);
  else    await db.insert('clientes', fila);

  closeModal(); render();
  toast(id ? 'Cliente actualizado ✓' : 'Cliente creado ✓');
}

/* ---- Colaboradores --------------------------------------------------------
   Contactos de la operación (jefes, coordinadores, el señor del parqueadero).
   NO son usuarios de la app: son la agenda de con quién se trabaja.
   -------------------------------------------------------------------------- */
function modalColaborador(id = null, clientePreset = null){
  const c = id ? colab(id) : null;
  openModal(formModal(id ? 'Editar colaborador' : 'Nuevo colaborador', `
    <div><label>Nombre completo</label>
      <input id="coN" placeholder="Ej. Carlos Pérez" value="${esc(c?.nombre || '')}"></div>
    <div class="f2">
      <div><label>Cédula (opcional)</label>
        <input id="coCed" inputmode="numeric" placeholder="79456123" value="${esc(c?.cedula || '')}"></div>
      <div><label>Cargo</label><select id="coCargo">
        ${lista('cargo_colaborador').map(x =>
          `<option ${(c?.cargo || 'Coordinador') === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
      </select></div>
    </div>
    <div class="f2">
      <div><label>Celular</label>
        <input id="coCel" inputmode="tel" placeholder="3114567890" value="${esc(c?.celular || '')}"></div>
      <div><label>Correo</label>
        <input id="coMail" type="email" placeholder="nombre@empresa.com" value="${esc(c?.correo || '')}"></div>
    </div>
    <div class="f2">
      <div><label>Área / dependencia</label>
        <input id="coArea" placeholder="Ej. Logística" value="${esc(c?.area || '')}"></div>
      <div><label>Ciudad</label>
        <input id="coCiudad" placeholder="Bogotá" value="${esc(c?.ciudad || '')}"></div>
    </div>
    <div class="f2">
      <div><label>Cliente</label><select id="coCli">${optsCli(c?.cliente_id ?? clientePreset)}</select></div>
      <div><label>Estado</label><select id="coAct">
        <option value="1" ${c?.activo !== false ? 'selected' : ''}>Activo</option>
        <option value="0" ${c?.activo === false ? 'selected' : ''}>Inactivo</option>
      </select></div>
    </div>
    <div><label>Notas</label>
      <textarea id="coNotas" placeholder="Ej. Aprueba los informes, responde mejor por WhatsApp">${esc(c?.notas || '')}</textarea></div>`,
    `guardarColaborador(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear'));
}

async function guardarColaborador(id = null){
  const nombre = $('#coN').value.trim();
  if(!nombre){ toast('Escribe el nombre'); return; }

  const fila = {
    nombre,
    cedula:     $('#coCed').value.trim(),
    cargo:      $('#coCargo').value,
    celular:    $('#coCel').value.trim(),
    correo:     $('#coMail').value.trim(),
    area:       $('#coArea').value.trim(),
    ciudad:     $('#coCiudad').value.trim(),
    cliente_id: $('#coCli').value || null,
    activo:     $('#coAct').value === '1',
    notas:      $('#coNotas').value.trim()
  };

  if(id) await db.update('colaboradores', id, fila);
  else    await db.insert('colaboradores', fila);

  closeModal(); render();
  toast(id ? 'Colaborador actualizado ✓' : 'Colaborador creado ✓');
}

function eliminarColaborador(id){
  const c = colab(id);
  const n = S.tareas.filter(t => t.persona_id === id).length;
  confirmarPeligro('¿Eliminar este colaborador?',
    `"${c.nombre}"` +
    (n ? `\n\nTiene ${n} tarea${n > 1 ? 's' : ''} relacionada${n > 1 ? 's' : ''}: quedarán sin persona.` : '') +
    `\n\nEsta acción no se puede deshacer.`,
    async () => {
      for(const t of S.tareas.filter(x => x.persona_id === id))
        await db.update('tareas', t.id, { persona_id: null });
      await db.remove('colaboradores', id);
      render(); toast('Colaborador eliminado');
    });
}

/** Crear una tarea ya apuntando a una persona (desde su ficha). */
function tareaParaPersona(pid){
  modalTarea();
  setTimeout(() => {
    const sel = $('#mPersona');
    if(sel){ sel.value = pid; sincronizarPersona(); }
  }, 80);
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
