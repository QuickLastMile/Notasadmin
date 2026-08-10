/* ============================================================================
   PREGUNTAS — el banco de preguntas que alimenta los formularios
   ----------------------------------------------------------------------------
   Se administran desde Configuración: crear, editar, duplicar, activar,
   desactivar y eliminar. Cada una define su tipo de respuesta y, si aplica,
   sus opciones.
   ========================================================================== */

/** Formulario de pregunta, en panel lateral para que quepa todo. */
function modalPregunta(id = null){
  const q = id ? S.preguntas.find(x => x.id === id) : null;
  const tipo = q?.tipo || 'texto';

  openDrawer(`
    <div class="drawer-h">
      <h3>${id ? 'Editar pregunta' : 'Nueva pregunta'}</h3>
      <button class="btn sm" onclick="cerrarDrawer()">✕</button>
    </div>

    <div class="drawer-b f">
      <div><label>Pregunta</label>
        <textarea id="qT" placeholder="Ej. ¿El mensajero realizó correctamente la entrega?"
                  style="min-height:64px">${esc(q?.texto || '')}</textarea></div>

      <div><label>Tipo de respuesta</label>
        <select id="qTipo" onchange="pintarOpcionesPregunta()">
          ${Object.entries(TIPOS_RESPUESTA).map(([k, v]) =>
            `<option value="${k}" ${tipo === k ? 'selected' : ''}>${v.ico}  ${v.l}</option>`).join('')}
        </select></div>

      <!-- Solo aparece si el tipo lo necesita -->
      <div id="qOpcionesBox"></div>

      <div class="f2">
        <div><label>Proyecto</label>
          <select id="qProy"><option value="">— Ninguno —</option>${optsProy(q?.proyecto_id)}</select></div>
        <div><label>Categoría</label>
          <select id="qCat"><option value="">— Sin categoría —</option>
            ${lista('categoria').map(c =>
              `<option ${q?.categoria === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select></div>
      </div>

      <div class="f2">
        <div><label>Orden</label>
          <input id="qOrden" type="number" value="${q?.orden ?? (S.preguntas.length + 1)}"></div>
        <div><label>Estado</label>
          <select id="qActiva">
            <option value="1" ${q?.activa !== false ? 'selected' : ''}>Activa</option>
            <option value="0" ${q?.activa === false ? 'selected' : ''}>Inactiva</option>
          </select></div>
      </div>

      <div class="f-check">
        <label><input type="checkbox" id="qObl" ${q?.obligatoria ? 'checked' : ''}>
          Respuesta obligatoria</label>
      </div>
    </div>

    <div class="drawer-f">
      <button class="btn" onclick="cerrarDrawer()">Cancelar</button>
      <button class="btn pri" onclick="guardarPregunta(${id ? `'${id}'` : 'null'})">
        ${id ? 'Guardar cambios' : 'Crear pregunta'}</button>
    </div>`);

  pintarOpcionesPregunta(q?.opciones || []);
}

/** Muestra u oculta el editor de opciones según el tipo elegido. */
function pintarOpcionesPregunta(iniciales = null){
  const tipo = $('#qTipo').value;
  const box  = $('#qOpcionesBox');
  if(!TIPOS_RESPUESTA[tipo].opciones){ box.innerHTML = ''; box.dataset.ops = '[]'; return; }

  const ops = iniciales || JSON.parse(box.dataset.ops || '[]');
  if(!ops.length) ops.push('', '');
  box.dataset.ops = JSON.stringify(ops);

  box.innerHTML = `
    <label>Opciones de respuesta</label>
    <div id="qOpsLista" style="display:grid;gap:8px">
      ${ops.map((o, i) => `
        <div style="display:flex;gap:8px;align-items:center">
          <span style="color:var(--text-3);font-size:12px;width:16px">${i + 1}</span>
          <input value="${esc(o)}" placeholder="Opción ${i + 1}"
                 oninput="editarOpcion(${i}, this.value)" style="flex:1">
          <button type="button" class="btn sm dgr" onclick="quitarOpcion(${i})"
                  ${ops.length <= 2 ? 'disabled style="opacity:.35"' : ''}>✕</button>
        </div>`).join('')}
    </div>
    <button type="button" class="btn sm" style="margin-top:9px" onclick="agregarOpcion()">
      + Agregar opción</button>`;
}

const opsActuales = () => JSON.parse($('#qOpcionesBox').dataset.ops || '[]');
const guardarOps  = ops => $('#qOpcionesBox').dataset.ops = JSON.stringify(ops);

function editarOpcion(i, v){ const o = opsActuales(); o[i] = v; guardarOps(o); }
function agregarOpcion(){ const o = opsActuales(); o.push(''); pintarOpcionesPregunta(o); }
function quitarOpcion(i){
  const o = opsActuales();
  if(o.length <= 2) return;      // una selección con una sola opción no tiene sentido
  o.splice(i, 1);
  pintarOpcionesPregunta(o);
}

async function guardarPregunta(id = null){
  const texto = $('#qT').value.trim();
  if(!texto){ toast('Escribe la pregunta'); return; }

  const tipo = $('#qTipo').value;
  const opciones = TIPOS_RESPUESTA[tipo].opciones
    ? opsActuales().map(o => o.trim()).filter(Boolean) : [];

  if(TIPOS_RESPUESTA[tipo].opciones && opciones.length < 2){
    toast('Una selección necesita al menos dos opciones'); return;
  }

  const fila = {
    texto, tipo, opciones,
    proyecto_id: $('#qProy').value || null,
    categoria:   $('#qCat').value || null,
    orden:       +$('#qOrden').value || 0,
    activa:      $('#qActiva').value === '1',
    obligatoria: $('#qObl').checked
  };

  if(id) await db.update('preguntas', id, fila);
  else    await db.insert('preguntas', fila);

  cerrarDrawer(); render();
  toast(id ? 'Pregunta actualizada ✓' : 'Pregunta creada ✓');
}

async function duplicarPregunta(id){
  const q = S.preguntas.find(x => x.id === id);
  const { id: _, created_at, updated_at, ...resto } = q;
  await db.insert('preguntas', { ...resto, texto: q.texto + ' (copia)', activa: false });
  render(); toast('Pregunta duplicada — quedó inactiva');
}

async function alternarPregunta(id){
  const q = S.preguntas.find(x => x.id === id);
  await db.update('preguntas', id, { activa: !q.activa });
  render(); toast(q.activa ? 'Pregunta desactivada' : 'Pregunta activada ✓');
}

async function eliminarPregunta(id){
  const q = S.preguntas.find(x => x.id === id);
  confirmarPeligro(
    '¿Eliminar esta pregunta?',
    `"${q.texto}"\n\nEsta acción no se puede deshacer.`,
    async () => { await db.remove('preguntas', id); render(); toast('Pregunta eliminada'); });
}
