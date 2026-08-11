/* FORMULARIOS — administración, resultados y exportación */

const formsProyecto = id => S.formularios.filter(f => f.proyecto_id === id);
const respuestasForm = id => S.respuestas.filter(r => r.formulario_id === id);
const preguntasForm = id => S.preguntas.filter(q => q.formulario_id === id).sort((a,b)=>(a.orden||0)-(b.orden||0));
const urlFormulario = f => `${location.origin}${location.pathname}?form=${f.public_token}`;

function modalFormulario(proyectoId, id = null){
  const f = id ? S.formularios.find(x => x.id === id) : null;
  openModal(formModal(id ? 'Editar formulario' : 'Nuevo formulario', `
    <div><label>Nombre</label><input id="fmNombre" placeholder="Ej. Preoperacional diario" value="${esc(f?.nombre||'')}"></div>
    <div><label>Descripción e instrucciones</label><textarea id="fmDesc" placeholder="Explica quién debe responder y para qué">${esc(f?.descripcion||'')}</textarea></div>
    <div class="f2">
      <div><label>Estado</label><select id="fmEstado">
        ${[['borrador','Borrador'],['publicado','Publicado'],['cerrado','Cerrado']].map(([k,l])=>`<option value="${k}" ${(f?.estado||'borrador')===k?'selected':''}>${l}</option>`).join('')}
      </select></div>
      <div><label>Respuestas</label><select id="fmRepite">
        <option value="1" ${f?.permitir_repetidas!==false?'selected':''}>Permitir varias</option>
        <option value="0" ${f?.permitir_repetidas===false?'selected':''}>Una por dispositivo</option>
      </select></div>
    </div>
    <div class="f2">
      <div><label>Abre (opcional)</label><input type="datetime-local" id="fmAbre" value="${(f?.abre||'').slice(0,16)}"></div>
      <div><label>Cierra (opcional)</label><input type="datetime-local" id="fmCierra" value="${(f?.cierra||'').slice(0,16)}"></div>
    </div>
    <div><label>Mensaje después de enviar</label><input id="fmMensaje" value="${esc(f?.mensaje||'Tu respuesta fue registrada correctamente.')}"></div>`,
    `guardarFormulario('${proyectoId}',${id?`'${id}'`:'null'})`, id?'Guardar cambios':'Crear'));
}

async function guardarFormulario(proyectoId,id=null){
  const nombre=$('#fmNombre').value.trim(); if(!nombre){toast('Escribe el nombre');return;}
  const fila={proyecto_id:proyectoId,nombre,descripcion:$('#fmDesc').value.trim(),estado:$('#fmEstado').value,
    permitir_repetidas:$('#fmRepite').value==='1',abre:$('#fmAbre').value?new Date($('#fmAbre').value).toISOString():null,
    cierra:$('#fmCierra').value?new Date($('#fmCierra').value).toISOString():null,mensaje:$('#fmMensaje').value.trim()};
  const guardado=id?await db.update('formularios',id,fila):await db.insert('formularios',{...fila,public_token:crypto.randomUUID()});
  closeModal();render(); if(guardado) verFormularioAdmin(guardado.id); toast(id?'Formulario actualizado':'Formulario creado');
}

function tarjetaFormularioProyecto(f){
  const rs=respuestasForm(f.id), qs=preguntasForm(f.id);
  const tono=f.estado==='publicado'?'o':f.estado==='cerrado'?'n':'w';
  return `<div class="tf-paso" style="width:100%">
    <button style="display:flex;align-items:center;gap:10px;flex:1;text-align:left;min-width:0" onclick="closeModal();verFormularioAdmin('${f.id}')">
      <span style="font-size:20px">▤</span><span style="flex:1"><b>${esc(f.nombre)}</b><small style="display:block">${qs.length} elementos · ${rs.length} respuestas</small></span>
      <span class="chip ${tono}">${esc(f.estado)}</span></button>
    <button class="btn sm dgr" onclick="eliminarFormulario('${f.id}')" title="Eliminar formulario">✕</button></div>`;
}

function verFormularioAdmin(id){
  const f=S.formularios.find(x=>x.id===id); if(!f)return;
  const qs=preguntasForm(id), rs=respuestasForm(id), docs=new Set(rs.map(r=>r.documento).filter(Boolean));
  const hoy=rs.filter(r=>(r.created_at||'').slice(0,10)===hoyISO()).length;
  openModal(`<div class="modal-h"><h3 style="flex:1">${esc(f.nombre)}</h3>
    <button class="btn sm" onclick="closeModal();modalFormulario('${f.proyecto_id}','${f.id}')">✎</button><button class="btn sm" onclick="closeModal()">✕</button></div>
    <div class="modal-b" style="gap:14px">
      <div style="display:flex;gap:7px;flex-wrap:wrap"><span class="chip ${f.estado==='publicado'?'o':'w'}">${esc(f.estado)}</span>
        <span class="chip n">${qs.length} preguntas</span><span class="chip n">${rs.length} respuestas</span></div>
      ${f.descripcion?`<div class="tf-notas">${esc(f.descripcion)}</div>`:''}
      <div class="grid g4">${kpi('Respuestas',rs.length,'acumuladas')}${kpi('Hoy',hoy,'enviadas hoy')}${kpi('Personas',docs.size,'documentos únicos')}${kpi('Preguntas',qs.length,'activas')}</div>
      ${f.estado==='publicado'?`<div class="cfg-nota"><strong>Enlace público</strong><p style="word-break:break-all">${esc(urlFormulario(f))}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" onclick="copiarLinkFormulario('${f.id}')">Copiar enlace</button>
        <a class="btn" href="${esc(urlFormulario(f))}" target="_blank" rel="noopener">Abrir formulario ↗</a></div></div>`:
        `<div class="cfg-nota"><b>Publica el formulario para generar su enlace.</b></div>`}
      <div class="tf-tit"><span>Preguntas</span><div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn sm" onclick="agregarDesdeBanco('${f.id}')">＋ Desde el banco</button>
        <button class="btn sm pri" onclick="closeModal();modalPregunta(null,'${f.id}')">+ Nueva pregunta</button></div></div>
      <div class="tf-lista">${qs.length?qs.map((q,i)=>`<button class="form-pregunta-admin ${q.tipo==='encabezado'?'encabezado':''}" onclick="closeModal();modalPregunta('${q.id}')">
        <span class="orden">${q.tipo==='encabezado'?'§':qs.slice(0,i+1).filter(x=>x.tipo!=='encabezado').length}</span><span><b>${esc(q.texto)}</b><small style="display:block;color:var(--text-3);margin-top:3px">${esc(TIPOS_RESPUESTA[q.tipo]?.l||q.tipo)}${q.obligatoria?' · OBLIGATORIA':''}</small></span><span>✎</span></button>`).join(''):'<div class="tf-vacio">Agrega preguntas o encabezados para organizar el formulario.</div>'}</div>
      <div class="tf-tit"><span>Respuestas recientes</span><div><button class="btn sm" onclick="recargarRespuestas('${f.id}')">↻ Actualizar</button> <button class="btn sm" onclick="exportarRespuestas('${f.id}')" ${rs.length?'':'disabled'}>⬇ Excel CSV</button></div></div>
      <div class="cfg-nota"><strong>Google Sheets</strong><p>${f.google_sheet_synced_at?`Última sincronización: ${fechaHoraRespuesta(f.google_sheet_synced_at)}`:'Crea una hoja y envía allí las respuestas actuales.'}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ${f.google_sheet_id?'':'pri'}" onclick="sincronizarGoogleSheet('${f.id}')">${f.google_sheet_id?'↻ Sincronizar ahora':'＋ Crear hoja de respuestas'}</button>
        ${f.google_sheet_url?`<a class="btn" href="${esc(f.google_sheet_url)}" target="_blank" rel="noopener">Abrir hoja ↗</a>`:''}</div></div>
      <div class="tf-lista">${rs.length?[...rs].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,50).map(r=>`<div class="tf-paso"><button style="flex:1;text-align:left" onclick="verRespuesta('${r.id}')"><b>${esc(r.nombre||'Respuesta')}</b><small style="display:block">${esc(r.documento||'Sin documento')} · ${fechaHoraRespuesta(r.created_at)}</small></button>
        <button class="btn sm" onclick="verRespuesta('${r.id}')">Ver</button><button class="btn sm dgr" onclick="eliminarRespuesta('${r.id}')">✕</button></div>`).join(''):'<div class="tf-vacio">Aún no hay respuestas.</div>'}</div>
    </div><div class="modal-f"><button class="btn peligro" onclick="eliminarFormulario('${f.id}')">Eliminar formulario</button><button class="btn" onclick="closeModal()">Cerrar</button></div>`,'modal-proyecto');
}

async function copiarLinkFormulario(id){const f=S.formularios.find(x=>x.id===id);await navigator.clipboard.writeText(urlFormulario(f));toast('Enlace copiado');}
async function recargarRespuestas(id){if(NUBE){const {data,error}=await sb.from('respuestas').select('*').eq('formulario_id',id);if(error){toast(error.message);return;}S.respuestas=S.respuestas.filter(r=>r.formulario_id!==id).concat(data||[]);}verFormularioAdmin(id);toast('Respuestas actualizadas');}

function agregarDesdeBanco(formularioId){
  const f=S.formularios.find(x=>x.id===formularioId),actuales=new Set(preguntasForm(formularioId).map(q=>q.texto.trim().toLowerCase()));
  const banco=S.preguntas.filter(q=>q.activa!==false&&q.formulario_id!==formularioId&&!actuales.has(q.texto.trim().toLowerCase()))
    .sort((a,b)=>(a.categoria||'').localeCompare(b.categoria||'')||(a.orden||0)-(b.orden||0));
  openModal(`<div class="modal-h"><h3 style="flex:1">Agregar desde el banco</h3><button class="btn sm" onclick="closeModal();verFormularioAdmin('${formularioId}')">✕</button></div>
    <div class="modal-b"><p style="color:var(--text-2);font-size:13px">Selecciona preguntas ya creadas. Se copiarán a <b>${esc(f.nombre)}</b> sin modificar las originales.</p>
      ${banco.length?`<div class="tf-lista">${banco.map(q=>`<label class="form-pregunta-admin ${q.tipo==='encabezado'?'encabezado':''}" style="cursor:pointer">
        <input type="checkbox" class="banco-check" value="${q.id}" style="width:18px;height:18px">
        <span><b>${esc(q.texto)}</b><small style="display:block;color:var(--text-3);margin-top:3px">${esc(q.categoria||'Sin categoría')} · ${esc(TIPOS_RESPUESTA[q.tipo]?.l||q.tipo)}</small></span><span></span></label>`).join('')}</div>`:
        '<div class="tf-vacio">No hay preguntas disponibles en el banco, o todas ya están en este formulario.</div>'}
    </div><div class="modal-f"><button class="btn" onclick="closeModal();verFormularioAdmin('${formularioId}')">Cancelar</button>
      <button class="btn pri" onclick="confirmarBanco('${formularioId}')" ${banco.length?'':'disabled'}>Agregar seleccionadas</button></div>`,'modal-proyecto');
}

async function confirmarBanco(formularioId){
  const ids=[...document.querySelectorAll('.banco-check:checked')].map(x=>x.value);
  if(!ids.length){toast('Selecciona al menos una pregunta');return;}
  const f=S.formularios.find(x=>x.id===formularioId);let orden=Math.max(0,...preguntasForm(formularioId).map(q=>q.orden||0));
  for(const id of ids){
    const q=S.preguntas.find(x=>x.id===id);if(!q)continue;
    await db.insert('preguntas',{texto:q.texto,tipo:q.tipo,opciones:[...(q.opciones||[])],proyecto_id:f.proyecto_id,
      formulario_id:formularioId,categoria:q.categoria||null,orden:++orden,activa:true,obligatoria:q.tipo==='encabezado'?false:!!q.obligatoria});
  }
  verFormularioAdmin(formularioId);toast(`${ids.length} pregunta${ids.length===1?'':'s'} agregada${ids.length===1?'':'s'}`);
}

function exportarRespuestas(id){
  const f=S.formularios.find(x=>x.id===id),qs=preguntasForm(id),rs=respuestasForm(id),sep=';';
  const cel=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const respondibles=qs.filter(q=>q.tipo!=='encabezado');
  const filas=[['Fecha','Hora','Nombre','Documento',...respondibles.map(q=>q.texto)],...rs.map(r=>{const d=new Date(r.created_at);return[
    d.toLocaleDateString('es-CO'),d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),r.nombre,r.documento,
    ...respondibles.map(q=>Array.isArray(r.datos?.[q.id])?r.datos[q.id].join(', '):r.datos?.[q.id])];})];
  const blob=new Blob(['\ufeff'+filas.map(x=>x.map(cel).join(sep)).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`${f.nombre.replace(/[^a-z0-9]+/gi,'_')}_respuestas.csv`;a.click();URL.revokeObjectURL(a.href);
}

async function respuestaATarea(id){const r=S.respuestas.find(x=>x.id===id),f=S.formularios.find(x=>x.id===r.formulario_id);await db.insert('tareas',{titulo:`Revisar respuesta de ${r.nombre||r.documento||'formulario'}`,cliente_id:null,proyecto_id:f.proyecto_id,prioridad:'media',estado:'pendiente',vence:hoyISO(),notas:`Respuesta del formulario ${f.nombre}. Documento: ${r.documento||'No informado'}`,checklist:[],seguimiento:[],adjuntos:[]});toast('Tarea creada');}
async function respuestaANovedad(id){const r=S.respuestas.find(x=>x.id===id),f=S.formularios.find(x=>x.id===r.formulario_id);await db.insert('novedades',{fecha:hoyISO(),titulo:`Revisar novedad de ${r.nombre||r.documento||'formulario'}`,detalle:`Originada en ${f.nombre}. Documento: ${r.documento||'No informado'}`,cliente_id:null,criticidad:'media',estado:'abierta',seguimiento:[],evidencias:[]});toast('Novedad creada');}

const fechaHoraRespuesta=iso=>new Date(iso).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});

function verRespuesta(id){
  const r=S.respuestas.find(x=>x.id===id);if(!r)return;const f=S.formularios.find(x=>x.id===r.formulario_id),qs=preguntasForm(r.formulario_id).filter(q=>q.tipo!=='encabezado');
  openModal(`<div class="modal-h"><h3 style="flex:1">Respuesta de ${esc(r.nombre||r.documento||'colaborador')}</h3><button class="btn sm" onclick="closeModal();verFormularioAdmin('${r.formulario_id}')">←</button><button class="btn sm" onclick="closeModal()">✕</button></div>
    <div class="modal-b"><div style="display:flex;gap:7px;flex-wrap:wrap"><span class="chip n">${fechaHoraRespuesta(r.created_at)}</span>${r.documento?`<span class="chip n">CC ${esc(r.documento)}</span>`:''}</div>
    <div class="respuesta-detalle">${qs.map(q=>{const v=r.datos?.[q.id],txt=Array.isArray(v)?v.join(', '):v;return `<div class="respuesta-dato"><small>${esc(q.texto)}</small><b>${esc(txt||'—')}</b></div>`;}).join('')}</div></div>
    <div class="modal-f"><button class="btn peligro" onclick="eliminarRespuesta('${r.id}')">Eliminar respuesta</button><button class="btn" onclick="respuestaATarea('${r.id}')">+ Tarea</button><button class="btn" onclick="respuestaANovedad('${r.id}')">+ Novedad</button></div>`,'modal-proyecto');
}

function eliminarRespuesta(id){const r=S.respuestas.find(x=>x.id===id);confirmarPeligro('¿Eliminar esta respuesta?','La respuesta y sus datos se borrarán definitivamente.',async()=>{await db.remove('respuestas',id);verFormularioAdmin(r.formulario_id);toast('Respuesta eliminada');});}

function eliminarFormulario(id){const f=S.formularios.find(x=>x.id===id);confirmarPeligro('¿Eliminar este formulario?',`Se eliminarán "${f.nombre}", sus preguntas y todas sus respuestas.`,async()=>{await db.remove('formularios',id);S.preguntas=S.preguntas.filter(q=>q.formulario_id!==id);S.respuestas=S.respuestas.filter(r=>r.formulario_id!==id);if(!NUBE)save();render();toast('Formulario eliminado');});}
