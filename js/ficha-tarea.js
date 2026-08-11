/* ============================================================================
   FICHA DE TAREA — el espacio de trabajo de una tarea
   ----------------------------------------------------------------------------
   Al tocar una tarea NO se abre el formulario de edición: se abre esto, que
   es donde de verdad se trabaja. Tachar pasos, dejar seguimiento, adjuntar
   el documento que llegó, y cerrarla contando cómo quedó.

   Editar los datos (fecha, prioridad, cliente…) es otra cosa, y va detrás
   del lápiz.
   ========================================================================== */

function verTarea(id){
  const t = S.tareas.find(x => x.id === id);
  if(!t) return;

  const hecho     = t.estado === 'hecho';
  const cancelada = t.estado === 'cancelada';
  const est = ESTADOS_TAREA[t.estado] || ESTADOS_TAREA.pendiente;
  const d = t.vence ? diasDesde(t.vence) : null;
  const persona = colab(t.persona_id);
  const p = pro(t.proyecto_id);

  const chk = t.checklist || [];
  const chkOk = chk.filter(x => x.ok).length;
  const seg = t.seguimiento || [];
  const adj = t.adjuntos || [];

  const meta = [
    t.tipo ? esc(t.tipo) : null,
    persona ? `👤 ${esc(persona.nombre)}${persona.cargo ? ' · ' + esc(persona.cargo) : ''}` : null,
    t.cliente_id ? cliTag(t.cliente_id) : null,
    p ? `📁 ${esc(p.nombre)}` : null
  ].filter(Boolean);

  openModal(`
    <div class="modal-h">
      <h3 style="flex:1;min-width:0">${esc(t.titulo)}</h3>
      <button class="btn sm" onclick="closeModal();modalTarea('${t.id}')" title="Editar los datos">✎</button>
      <button class="btn sm" onclick="closeModal()">✕</button>
    </div>

    <div class="modal-b" style="gap:0">

      <!-- Estado de un vistazo -->
      <div class="tf-cab">
        <button class="chk grande ${hecho ? 'on' : ''}" onclick="toggleTarea('${t.id}');closeModal()"
                title="${hecho ? 'Reabrir' : 'Marcar como hecha'}">✓</button>
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="chip ${est.c}">${est.l}</span>
            <span class="chip ${PRI[t.prioridad]?.c || 'n'}">${PRI[t.prioridad]?.l || 'Media'}</span>
            ${t.vence ? `<span class="chip ${d < 0 && !hecho ? 'd' : d === 0 ? 'w' : 'n'}">
              ${fechaTxt(t.vence)}${t.hora ? ' · ' + esc(t.hora) : ''}</span>` : ''}
            ${t.repite ? `<span class="chip n">🔁 ${esc(REPETICIONES[t.repite]?.l || '')}</span>` : ''}
          </div>
          ${meta.length ? `<div class="tf-meta">${meta.join(' · ')}</div>` : ''}
        </div>
      </div>

      ${t.estado === 'en_espera' && (t.espera_que || t.espera_fecha) ? `
        <div class="alert ${t.espera_fecha && diasDesde(t.espera_fecha) < 0 ? 'd' : 'w'}"
             style="margin-bottom:4px">
          <span>⏳</span>
          <div class="a-txt"><b>${esc(t.espera_que || 'En espera')}</b>
            <small>${t.espera_fecha
              ? `Esperado ${fechaTxt(t.espera_fecha)}${diasDesde(t.espera_fecha) < 0 ? ' — toca volver a cobrar' : ''}`
              : 'Sin fecha esperada'}</small></div>
        </div>` : ''}

      ${t.notas ? `
        <div class="tf-notas">${esc(t.notas)}</div>` : ''}

      <!-- Checklist: se tacha aquí mismo -->
      <div class="tf-tit">
        <span>Checklist</span>
        ${chk.length ? `<span class="chip ${chkOk === chk.length ? 'o' : 'n'}">${chkOk}/${chk.length} · ${Math.round(pct(chkOk, chk.length) * 100)}%</span>` : ''}
      </div>
      ${chk.length ? `<div style="margin-bottom:9px">${barra(pct(chkOk, chk.length) * 100, chkOk === chk.length ? 'var(--ok)' : 'var(--brand)')}</div>` : ''}
      <div class="tf-lista">
        ${chk.length ? chk.map((paso, i) => `
          <div class="tf-paso ${paso.ok ? 'ok' : ''}">
            <button class="chk ${paso.ok ? 'on' : ''}" onclick="tacharPaso('${t.id}',${i})">✓</button>
            <span>${esc(paso.t)}</span>
            <button class="btn sm dgr" onclick="quitarPaso('${t.id}',${i})">✕</button>
          </div>`).join('') : '<div class="tf-vacio">Sin pasos todavía</div>'}
      </div>
      <div class="tf-alta">
        <input id="tfPaso" placeholder="Agregar un paso…"
               onkeydown="if(event.key==='Enter')agregarPaso('${t.id}')">
        <button class="btn" onclick="agregarPaso('${t.id}')">+ Paso</button>
      </div>

      <!-- Adjuntos -->
      <div class="tf-tit">
        <span>Documentos y fotos</span>
        ${adj.length ? `<span class="chip n">${adj.length}</span>` : ''}
      </div>
      <div class="tf-adjuntos">
        ${adj.length ? adj.map((a, i) => `
          <div class="tf-adj">
            <span class="tf-adj-ico">${esPDF(a.ref) ? '📄' : '🖼️'}</span>
            <div class="tf-adj-txt">
              <strong>${esc(a.nombre || 'Adjunto')}</strong>
              <small>${fechaCorta(a.fecha)}</small>
            </div>
            <button class="btn sm" onclick="verArchivo(${JSON.stringify(a.ref).replace(/"/g,'&quot;')},
              ${JSON.stringify(a.nombre || 'Adjunto').replace(/"/g,'&quot;')})">Ver</button>
            <button class="btn sm dgr" onclick="quitarAdjuntoTarea('${t.id}',${i})">✕</button>
          </div>`).join('') : '<div class="tf-vacio">Sin documentos adjuntos</div>'}
      </div>
      <button class="adj-btn" style="margin-top:9px"
              onclick="document.getElementById('tfArchivo').click()">
        <span class="adj-ico">📎</span>
        <span><strong>Adjuntar documento o foto</strong>
        <small>Imagen o PDF · se comprime solo</small></span>
      </button>
      <input type="file" id="tfArchivo" accept="image/*,application/pdf" capture="environment"
             style="display:none" onchange="adjuntarATarea('${t.id}', this)">

      <!-- Seguimiento: la bitácora de la tarea -->
      <div class="tf-tit"><span>Seguimiento</span>
        ${seg.length ? `<span class="chip n">${seg.length}</span>` : ''}</div>
      <div class="tf-lista">
        ${seg.length ? [...seg].reverse().map((s, iRev) => {
          const i = seg.length - 1 - iRev;
          return `
          <div class="tf-nota">
            <div class="tf-nota-txt">${esc(s.texto)}</div>
            <div class="tf-nota-pie">
              <span>${fechaCorta(s.fecha)}</span>
              <button class="btn sm dgr" onclick="quitarSeguimiento('${t.id}',${i})">✕</button>
            </div>
          </div>`;
        }).join('') : '<div class="tf-vacio">Aún no has anotado nada</div>'}
      </div>
      <div class="tf-alta">
        <input id="tfSeg" placeholder="Anotar qué pasó, a quién llamaste, qué respondieron…"
               onkeydown="if(event.key==='Enter')anotarSeguimiento('${t.id}')">
        <button class="btn" onclick="anotarSeguimiento('${t.id}')">Anotar</button>
      </div>

      ${hecho && t.resultado ? `
        <div class="tf-tit"><span>Cómo quedó</span></div>
        <div class="tf-notas" style="border-color:var(--ok)">${esc(t.resultado)}</div>` : ''}
    </div>

    <div class="modal-f">
      <button class="btn dgr" onclick="closeModal();eliminarTarea('${t.id}')">Eliminar</button>
      ${hecho || cancelada
        ? `<button class="btn pri" onclick="toggleTarea('${t.id}');closeModal()">↺ Reabrir</button>`
        : `<button class="btn" onclick="closeModal();modalFecha('${t.id}')">Reprogramar</button>
           <button class="btn pri" onclick="cerrarTarea('${t.id}')">✓ Cerrar tarea</button>`}
    </div>`);

  setTimeout(() => $('#tfPaso')?.focus(), 60);
}

/* ---- Checklist ----------------------------------------------------------- */
async function tacharPaso(id, i){
  const t = S.tareas.find(x => x.id === id);
  const chk = [...(t.checklist || [])];
  chk[i] = { ...chk[i], ok: !chk[i].ok };
  await db.update('tareas', id, { checklist: chk });
  render(); verTarea(id);
}

async function agregarPaso(id){
  const inp = $('#tfPaso');
  const v = inp.value.trim();
  if(!v) return;
  const t = S.tareas.find(x => x.id === id);
  await db.update('tareas', id, { checklist: [...(t.checklist || []), { t:v, ok:false }] });
  render(); verTarea(id);
}

async function quitarPaso(id, i){
  const t = S.tareas.find(x => x.id === id);
  const chk = [...(t.checklist || [])];
  chk.splice(i, 1);
  await db.update('tareas', id, { checklist: chk });
  render(); verTarea(id);
}

/* ---- Seguimiento --------------------------------------------------------- */
async function anotarSeguimiento(id){
  const inp = $('#tfSeg');
  const v = inp.value.trim();
  if(!v) return;
  const t = S.tareas.find(x => x.id === id);
  await db.update('tareas', id, {
    seguimiento: [...(t.seguimiento || []), { fecha: hoyISO(), texto: v }]
  });
  render(); verTarea(id);
  toast('Anotado ✓');
}

async function quitarSeguimiento(id, i){
  const t = S.tareas.find(x => x.id === id);
  const seg = [...(t.seguimiento || [])];
  seg.splice(i, 1);
  await db.update('tareas', id, { seguimiento: seg });
  render(); verTarea(id);
}

/* ---- Adjuntos ------------------------------------------------------------ */
async function adjuntarATarea(id, input){
  const file = input.files?.[0];
  if(!file) return;
  input.value = '';
  toast('Procesando el archivo…');

  try{
    const ref = await guardarArchivo(file);
    if(!ref) return;
    const t = S.tareas.find(x => x.id === id);
    await db.update('tareas', id, {
      adjuntos: [...(t.adjuntos || []),
                 { ref, nombre: file.name || 'Adjunto', fecha: hoyISO() }]
    });
    render(); verTarea(id);
    toast('Adjuntado ✓');
  }catch(e){
    console.error(e);
    toast('No se pudo procesar el archivo');
  }
}

async function quitarAdjuntoTarea(id, i){
  const t = S.tareas.find(x => x.id === id);
  const adj = [...(t.adjuntos || [])];
  const [borrado] = adj.splice(i, 1);
  await borrarArchivo(borrado.ref);
  await db.update('tareas', id, { adjuntos: adj });
  render(); verTarea(id);
  toast('Adjunto eliminado');
}

/* ---- Cerrar la tarea ----------------------------------------------------- */
/** Al cerrar se pide el resultado: es la única nota que se lee después. */
function cerrarTarea(id){
  const t = S.tareas.find(x => x.id === id);
  const chk = t.checklist || [];
  const faltan = chk.filter(x => !x.ok).length;

  openModal(formModal('Cerrar tarea', `
    <p style="font-size:13.5px;color:var(--text-2)">${esc(t.titulo)}</p>

    ${faltan ? `
      <div class="alert w">
        <span>☑</span>
        <div class="a-txt"><b>Quedan ${faltan} paso${faltan > 1 ? 's' : ''} sin tachar</b>
          <small>Puedes cerrarla igual; los pasos quedan como están.</small></div>
      </div>` : ''}

    <div><label>¿Cómo quedó?</label>
      <textarea id="tcRes" placeholder="Qué se resolvió, qué se acordó, con quién quedó"
                style="min-height:80px">${esc(t.resultado || '')}</textarea></div>

    <div class="f-check">
      <label><input type="checkbox" id="tcCancel"> Cerrarla como cancelada</label>
    </div>`,
    `guardarCierreTarea('${id}')`, 'Cerrar tarea'));
}

async function guardarCierreTarea(id){
  const t = S.tareas.find(x => x.id === id);
  const cancelada = $('#tcCancel').checked;
  const resultado = $('#tcRes').value.trim();

  await db.update('tareas', id, {
    estado: cancelada ? 'cancelada' : 'hecho',
    completada_el: hoyISO(),
    resultado
  });

  // Si se repite y se cerró como hecha, nace la siguiente
  if(!cancelada && t.repite && REPETICIONES[t.repite]){
    const base = t.vence && diasDesde(t.vence) > 0 ? new Date(t.vence + 'T00:00:00') : new Date();
    const prox = dISO(new Date(base.getTime() + REPETICIONES[t.repite].dias * 86400000));
    const { id:_, created_at, updated_at, ...resto } = t;
    await db.insert('tareas', { ...resto, estado:'pendiente', vence: prox,
      completada_el:null, resultado:'', seguimiento:[], adjuntos:[],
      checklist: (t.checklist || []).map(p => ({ ...p, ok:false })) });
    closeModal(); render();
    toast(`Cerrada ✓ — la próxima queda para ${fechaTxt(prox)}`);
    return;
  }

  closeModal(); render();
  toast(cancelada ? 'Tarea cancelada' : 'Tarea cerrada ✓');
}
