/* ============================================================================
   FICHA DE PROYECTO — objetivo, enlaces, tareas y seguimiento
   ========================================================================== */

const enlaceProyecto = (url, etiqueta, icono) => url ? `
  <a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
    ${icono} ${esc(etiqueta)} ↗</a>` : '';

function verProyecto(id){
  const p = pro(id);
  if(!p) return;
  const ap = avanceProyecto(p);
  const est = EST_PROYECTO[p.estado] || EST_PROYECTO.en_curso;
  const responsable = colab(p.responsable_id);
  const d = p.vence ? diasDesde(p.vence) : null;
  const pendientes = ap.tareas.filter(t => t.estado !== 'hecho');
  const vencidas = pendientes.filter(t => t.vence && diasDesde(t.vence) < 0);
  const seg = p.seguimiento || [];

  openModal(`
    <div class="modal-h">
      <h3 style="flex:1;min-width:0">${esc(p.nombre)}</h3>
      <button class="btn sm" onclick="closeModal();modalProyecto('${p.id}')" title="Editar proyecto">✎</button>
      <button class="btn sm" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-b" style="gap:0">
      <div class="tf-cab">
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="chip ${est.c}">${est.l}</span>
            ${p.cliente_id ? `<span class="chip n">${cliTag(p.cliente_id)}</span>` : ''}
            ${responsable ? `<span class="chip n">👤 ${esc(responsable.nombre)}</span>` : ''}
            ${p.vence ? `<span class="chip ${d < 0 && p.estado !== 'hecho' ? 'd' : d < 3 ? 'w' : 'n'}">Entrega ${fechaTxt(p.vence)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="tf-tit"><span>Avance</span><span class="chip ${ap.avance === 100 ? 'o' : 'n'}">${ap.avance}% · ${ap.automatico ? 'automático' : 'manual'}</span></div>
      <div style="margin-bottom:12px">${barra(ap.avance, 'var(--brand)')}</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px">
        <span class="chip n">${ap.hechas}/${ap.tareas.length} terminadas</span>
        <span class="chip ${pendientes.length ? 'w' : 'o'}">${pendientes.length} pendientes</span>
        ${vencidas.length ? `<span class="chip d">${vencidas.length} vencidas</span>` : ''}
      </div>

      ${p.notas ? `<div class="tf-tit"><span>Objetivo / resultado esperado</span></div><div class="tf-notas">${esc(p.notas)}</div>` : ''}

      ${camposProyectoFicha(p)}

      ${(p.repositorio_url || p.base_url || p.drive_folder_url || p.calendar_event_url || enlacesPersonalizadosProyecto(p).length) ? `
        <div class="tf-tit"><span>Recursos</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          ${enlaceProyecto(p.repositorio_url, 'Repositorio', '⌘')}
          ${enlaceProyecto(p.base_url, 'Base de trabajo', '▦')}
          ${enlaceProyecto(p.drive_folder_url, 'Carpeta de Drive', '▰')}
          ${enlaceProyecto(p.calendar_event_url, 'Evento en Calendar', '▣')}
          ${enlacesPersonalizadosProyecto(p).map(x => enlaceProyecto(x.url, x.nombre, '↗')).join('')}
        </div>` : ''}

      <div class="tf-tit"><span>Google Workspace</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        ${p.drive_folder_url?`<a class="btn" href="${esc(p.drive_folder_url)}" target="_blank" rel="noopener">Abrir Drive ↗</a>`:
          `<button class="btn" onclick="crearCarpetaDrive('${p.id}')">＋ Crear carpeta Drive</button>`}
        ${p.calendar_event_url?`<a class="btn" href="${esc(p.calendar_event_url)}" target="_blank" rel="noopener">Abrir Calendar ↗</a>`:
          `<button class="btn" onclick="crearEventoGoogleCalendar('${p.id}')">＋ Agregar a Calendar</button>`}
      </div>

      ${archivoDocumentalProyecto(p)}

      <div class="tf-tit"><span>Formularios públicos <span class="chip n">${formsProyecto(p.id).length}</span></span>
        <button class="btn sm pri" onclick="closeModal();modalFormulario('${p.id}')">＋ Agregar formulario</button></div>
      <div class="tf-lista">
        ${formsProyecto(p.id).length ? formsProyecto(p.id).map(tarjetaFormularioProyecto).join('')
          : '<div class="tf-vacio">Sin formularios. Puedes crear varios formularios para este proyecto y compartir cada uno con un enlace diferente.</div>'}
      </div>

      <div class="tf-tit"><span>Tareas del proyecto</span>
        <button class="btn sm pri" onclick="closeModal();modalTarea(null,'${p.id}')">+ Tarea</button></div>
      <div class="tf-lista">
        ${ap.tareas.length ? ap.tareas.map(t => {
          const e = ESTADOS_TAREA[t.estado] || ESTADOS_TAREA.pendiente;
          return `<button class="tf-paso" style="width:100%;text-align:left" onclick="closeModal();verTarea('${t.id}')">
            <span class="chk ${t.estado === 'hecho' ? 'on' : ''}">✓</span>
            <span style="flex:1">${esc(t.titulo)}</span>
            <span class="chip ${e.c}">${e.l}</span>
          </button>`;
        }).join('') : '<div class="tf-vacio">Sin tareas todavía. Agrega la primera para empezar a medir el avance.</div>'}
      </div>

      <div class="tf-tit"><span>Seguimiento</span><span class="chip n">${seg.length}</span></div>
      <div class="tf-lista">
        ${seg.length ? [...seg].reverse().map(s => `<div class="tf-paso">
          <span style="flex:1">${esc(s.texto)}</span><small>${fechaTxt(s.fecha)}</small>
        </div>`).join('') : '<div class="tf-vacio">Aún no hay actualizaciones</div>'}
      </div>
      <div class="tf-alta">
        <input id="proySeg" placeholder="Ej. Cliente aprobó la primera versión"
               onkeydown="if(event.key==='Enter')anotarSeguimientoProyecto('${p.id}')">
        <button class="btn" onclick="anotarSeguimientoProyecto('${p.id}')">Agregar</button>
      </div>
    </div>
    <div class="modal-f" style="justify-content:space-between">
      <button class="btn peligro" onclick="eliminarProyecto('${p.id}')">Eliminar</button>
      <div style="display:flex;gap:8px">
        ${p.estado !== 'hecho' ? `<button class="btn pri" onclick="entregarProyecto('${p.id}')">Marcar entregado</button>` : `<button class="btn" onclick="reabrirProyecto('${p.id}')">Reabrir</button>`}
        <button class="btn" onclick="closeModal()">Cerrar</button>
      </div>
    </div>`, 'modal-proyecto');
}

function camposProyectoFicha(p){
  const urls = new Set(enlacesPersonalizadosProyecto(p).map(x=>x.id));
  const defs=(S.campos_personalizados||[]).filter(c=>c.entidad==='proyectos'&&c.activo!==false&&!urls.has(c.id)&&p.campos?.[c.id]!==''&&p.campos?.[c.id]!=null).sort((a,b)=>(a.orden||0)-(b.orden||0));
  if(!defs.length)return '';
  return `<div class="tf-tit"><span>Información adicional</span></div><div class="ficha">${defs.map(c=>{const v=p.campos[c.id];const valor=c.tipo==='url'?`<a class="campo-url" href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v)} ↗</a>`:esc(c.tipo==='booleano'?(v?'Sí':'No'):v);return `<div class="ficha-fila"><span>${esc(c.nombre)}</span><strong>${valor}</strong></div>`;}).join('')}</div>`;
}

function enlacesPersonalizadosProyecto(p){
  return (S.campos_personalizados||[]).filter(c=>c.entidad==='proyectos'&&c.activo!==false&&p.campos?.[c.id]&&(
    c.tipo==='url'||(c.opciones||[]).includes('__nexa_url__')||/^https?:\/\//i.test(String(p.campos[c.id]))
  )).sort((a,b)=>(a.orden||0)-(b.orden||0)).map(c=>({id:c.id,nombre:c.nombre,url:p.campos[c.id]}));
}

async function anotarSeguimientoProyecto(id){
  const p = pro(id), input = $('#proySeg');
  const texto = input?.value.trim();
  if(!p || !texto) return;
  await db.update('proyectos', id, {
    seguimiento:[...(p.seguimiento || []), { fecha:hoyISO(), texto }]
  });
  verProyecto(id); render(); toast('Seguimiento agregado');
}

async function entregarProyecto(id){
  await db.update('proyectos', id, { estado:'hecho', avance:100 });
  verProyecto(id); render(); toast('Proyecto marcado como entregado ✓');
}

async function reabrirProyecto(id){
  await db.update('proyectos', id, { estado:'en_curso' });
  verProyecto(id); render(); toast('Proyecto reabierto');
}

function eliminarProyecto(id){
  const p = pro(id), cantidad = S.tareas.filter(t => t.proyecto_id === id).length;
  confirmarPeligro('¿Eliminar este proyecto?',
    `"${p.nombre}" se eliminará. Sus ${cantidad} tarea${cantidad === 1 ? '' : 's'} permanecerán, pero quedarán sin proyecto.`,
    async () => {
      for(const t of S.tareas.filter(t => t.proyecto_id === id))
        await db.update('tareas', t.id, { proyecto_id:null });
      for(const a of (docsProyecto(p).archivos || [])) await borrarArchivo(a.ref);
      await db.remove('proyectos', id);
      render(); toast('Proyecto eliminado');
    });
}
