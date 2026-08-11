/* ============================================================================
   NOVEDADES — estados, ficha y seguimiento
   ----------------------------------------------------------------------------
   Una novedad no es una tarea: la tarea es algo que TÚ decides hacer, la
   novedad es algo que PASÓ. Se registra para hacerle seguimiento, para tener
   el respaldo cuando el cliente pregunte, y para poder medir cuántas salen.
   ========================================================================== */

const ESTADOS_NOVEDAD = {
  abierta:    { l:'Abierta',    c:'d', ico:'🔴', ayuda:'Acaba de pasar, nadie la ha tomado.' },
  en_gestion: { l:'En gestión', c:'w', ico:'🟠', ayuda:'Ya se está trabajando en resolverla.' },
  cerrada:    { l:'Cerrada',    c:'o', ico:'✅', ayuda:'Resuelta, con su solución registrada.' }
};

const estadoNov = n => ESTADOS_NOVEDAD[n.estado] || ESTADOS_NOVEDAD.abierta;

/** Días que tardó (o lleva) en resolverse. */
function diasResolucion(n){
  const hasta = n.cerrada_el || hoyISO();
  const ms = new Date(hasta + 'T00:00:00') - new Date(n.fecha + 'T00:00:00');
  return Math.max(0, Math.round(ms / 86400000));
}

/* ---- Ficha ---------------------------------------------------------------- */
function verNovedad(id){
  const n = S.novedades.find(x => x.id === id);
  if(!n) return;

  const est = estadoNov(n);
  const cerrada = n.estado === 'cerrada';
  const persona = colab(n.persona_id);
  const mensajero = ben(n.beneficiario_id);
  const seg = n.seguimiento || [];
  const ev  = n.evidencias || [];
  const dias = diasResolucion(n);

  const dato = (etiqueta, valor) => valor ? `
    <div class="ficha-fila"><span>${esc(etiqueta)}</span><strong>${valor}</strong></div>` : '';

  return openModal(`
    <div class="modal-h">
      <h3 style="flex:1;min-width:0">${esc(n.titulo)}</h3>
      <button class="btn sm" onclick="closeModal();modalNovedad('${n.id}')" title="Editar los datos">✎</button>
      <button class="btn sm" onclick="closeModal()">✕</button>
    </div>

    <div class="modal-b" style="gap:0">

      <div class="tf-cab">
        <span style="font-size:26px">${est.ico}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="chip ${est.c}">${est.l}</span>
            <span class="chip ${n.criticidad === 'alta' ? 'd' : n.criticidad === 'media' ? 'w' : 'n'}">
              Criticidad ${esc(n.criticidad)}</span>
            ${n.tipo ? `<span class="chip n">${esc(n.tipo)}</span>` : ''}
            <span class="chip ${cerrada ? 'o' : dias > 7 ? 'd' : 'n'}">
              ${cerrada ? `Resuelta en ${dias} día${dias === 1 ? '' : 's'}`
                        : `Lleva ${dias} día${dias === 1 ? '' : 's'} abierta`}</span>
          </div>
          <div class="tf-meta">
            ${fechaCorta(n.fecha)}
            ${n.cliente_id ? ' · ' + cliTag(n.cliente_id) : ''}
          </div>
        </div>
      </div>

      ${n.detalle ? `<div class="tf-notas">${esc(n.detalle)}</div>` : ''}

      ${n.accion ? `
        <div class="alert ${cerrada ? 'o' : 'w'}" style="margin-top:12px">
          <span>→</span>
          <div class="a-txt"><b>Acción a tomar</b><small>${esc(n.accion)}</small></div>
        </div>` : ''}

      ${(persona || mensajero || n.reportado_por) ? `
        <div class="tf-tit"><span>Quiénes</span></div>
        <div class="ficha">
          ${dato('La reportó', esc(n.reportado_por))}
          ${dato('Persona del cliente', persona
            ? esc(persona.nombre) + (persona.cargo ? ` · ${esc(persona.cargo)}` : '') : '')}
          ${dato('Mensajero involucrado', mensajero ? esc(mensajero.nombre) : '')}
        </div>` : ''}

      <!-- Evidencia: la foto es lo que sostiene el reclamo después -->
      <div class="tf-tit">
        <span>Evidencia</span>
        ${ev.length ? `<span class="chip n">${ev.length}</span>` : ''}
      </div>
      <div class="tf-adjuntos">
        ${ev.length ? ev.map((a, i) => `
          <div class="tf-adj">
            <span class="tf-adj-ico">${esPDF(a.ref) ? '📄' : '🖼️'}</span>
            <div class="tf-adj-txt">
              <strong>${esc(a.nombre || 'Evidencia')}</strong>
              <small>${fechaCorta(a.fecha)}</small>
            </div>
            <button class="btn sm" onclick="verArchivo(${JSON.stringify(a.ref).replace(/"/g,'&quot;')},
              ${JSON.stringify(a.nombre || 'Evidencia').replace(/"/g,'&quot;')})">Ver</button>
            <button class="btn sm dgr" onclick="quitarEvidencia('${n.id}',${i})">✕</button>
          </div>`).join('') : '<div class="tf-vacio">Sin fotos ni documentos</div>'}
      </div>
      <button class="adj-btn" style="margin-top:9px"
              onclick="document.getElementById('nvArchivo').click()">
        <span class="adj-ico">📷</span>
        <span><strong>Adjuntar foto o documento</strong>
        <small>La evidencia es lo que sostiene el reclamo después</small></span>
      </button>
      <input type="file" id="nvArchivo" accept="image/*,application/pdf" capture="environment"
             style="display:none" onchange="adjuntarANovedad('${n.id}', this)">

      <!-- Seguimiento -->
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
              <button class="btn sm dgr" onclick="quitarSegNovedad('${n.id}',${i})">✕</button>
            </div>
          </div>`;
        }).join('') : '<div class="tf-vacio">Aún no has anotado nada</div>'}
      </div>
      <div class="tf-alta">
        <input id="nvSeg" placeholder="Qué se hizo, a quién se llamó, qué respondieron…"
               onkeydown="if(event.key==='Enter')anotarSegNovedad('${n.id}')">
        <button class="btn" onclick="anotarSegNovedad('${n.id}')">Anotar</button>
      </div>

      ${cerrada && n.solucion ? `
        <div class="tf-tit"><span>Cómo se resolvió</span></div>
        <div class="tf-notas" style="border-color:var(--ok)">${esc(n.solucion)}</div>
        <div class="tf-meta" style="margin-top:7px">Cerrada el ${fechaCorta(n.cerrada_el)}</div>` : ''}
    </div>

    <div class="modal-f">
      <button class="btn dgr" onclick="closeModal();eliminarNovedad('${n.id}')">Eliminar</button>
      <button class="btn" onclick="closeModal();novedadATarea('${n.id}')">+ Tarea</button>
      ${cerrada
        ? `<button class="btn pri" onclick="reabrirNovedad('${n.id}')">↺ Reabrir</button>`
        : `<button class="btn pri" onclick="cerrarNovedadCon('${n.id}')">✓ Cerrar</button>`}
    </div>`);
}

/* ---- Seguimiento ---------------------------------------------------------- */
async function anotarSegNovedad(id){
  const v = $('#nvSeg').value.trim();
  if(!v) return;
  const n = S.novedades.find(x => x.id === id);

  // Anotar equivale a estar gestionándola: se refleja en el estado
  const cambios = { seguimiento: [...(n.seguimiento || []), { fecha: hoyISO(), texto: v }] };
  if(n.estado === 'abierta') cambios.estado = 'en_gestion';

  await db.update('novedades', id, cambios);
  render(); verNovedad(id);
  toast('Anotado ✓');
}

async function quitarSegNovedad(id, i){
  const n = S.novedades.find(x => x.id === id);
  const seg = [...(n.seguimiento || [])];
  seg.splice(i, 1);
  await db.update('novedades', id, { seguimiento: seg });
  render(); verNovedad(id);
}

/* ---- Evidencia ------------------------------------------------------------ */
async function adjuntarANovedad(id, input){
  const file = input.files?.[0];
  if(!file) return;
  input.value = '';
  toast('Procesando la foto…');

  try{
    const ref = await guardarArchivo(file);
    if(!ref) return;
    const n = S.novedades.find(x => x.id === id);
    await db.update('novedades', id, {
      evidencias: [...(n.evidencias || []),
                   { ref, nombre: file.name || 'Evidencia', fecha: hoyISO() }]
    });
    render(); verNovedad(id);
    toast('Evidencia adjuntada ✓');
  }catch(e){
    console.error(e);
    toast('No se pudo procesar el archivo');
  }
}

async function quitarEvidencia(id, i){
  const n = S.novedades.find(x => x.id === id);
  const ev = [...(n.evidencias || [])];
  const [borrada] = ev.splice(i, 1);
  await borrarArchivo(borrada.ref);
  await db.update('novedades', id, { evidencias: ev });
  render(); verNovedad(id);
  toast('Evidencia eliminada');
}

/* ---- Cierre --------------------------------------------------------------- */
function cerrarNovedadCon(id){
  const n = S.novedades.find(x => x.id === id);
  const dias = diasResolucion(n);

  openModal(formModal('Cerrar novedad', `
    <p style="font-size:13.5px;color:var(--text-2)">${esc(n.titulo)}</p>
    <div class="alert ${dias > 7 ? 'w' : 'o'}">
      <span>⏱</span>
      <div class="a-txt"><b>Abierta desde ${fechaCorta(n.fecha)}</b>
        <small>${dias} día${dias === 1 ? '' : 's'} hasta hoy.
          Este número alimenta el promedio de resolución.</small></div>
    </div>
    <div><label>¿Cómo se resolvió?</label>
      <textarea id="nvSol" placeholder="Qué se hizo, quién lo resolvió, qué se acordó para que no se repita"
                style="min-height:80px">${esc(n.solucion || '')}</textarea></div>`,
    `guardarCierreNovedad('${id}')`, 'Cerrar novedad'));
}

async function guardarCierreNovedad(id){
  const solucion = $('#nvSol').value.trim();
  if(!solucion){ toast('Escribe cómo se resolvió — es lo que se consulta después'); return; }

  await db.update('novedades', id, {
    estado:'cerrada', cerrada_el: hoyISO(), solucion
  });
  closeModal(); render();
  toast('Novedad cerrada ✓');
}

async function reabrirNovedad(id){
  await db.update('novedades', id, { estado:'en_gestion', cerrada_el:null });
  render(); verNovedad(id);
  toast('Novedad reabierta');
}

/** Atajo de la lista: cerrar pidiendo la solución. */
const cerrarNovedad = id => cerrarNovedadCon(id);

function eliminarNovedad(id){
  const n = S.novedades.find(x => x.id === id);
  confirmarPeligro('¿Eliminar esta novedad?',
    `"${n.titulo}"\n\nSe pierde el registro y su evidencia. Esta acción no se puede deshacer.`,
    async () => {
      for(const e of (n.evidencias || [])) await borrarArchivo(e.ref);
      await db.remove('novedades', id);
      render(); toast('Novedad eliminada');
    });
}
