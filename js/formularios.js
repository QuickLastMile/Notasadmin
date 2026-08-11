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
  return `<button class="tf-paso" style="width:100%;text-align:left" onclick="closeModal();verFormularioAdmin('${f.id}')">
    <span style="font-size:20px">▤</span><span style="flex:1"><b>${esc(f.nombre)}</b><small style="display:block">${qs.length} preguntas · ${rs.length} respuestas</small></span>
    <span class="chip ${tono}">${esc(f.estado)}</span></button>`;
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
      <div class="tf-tit"><span>Preguntas</span><button class="btn sm pri" onclick="closeModal();modalPregunta(null,'${f.id}')">+ Pregunta</button></div>
      <div class="tf-lista">${qs.length?qs.map(q=>`<button class="tf-paso" onclick="closeModal();modalPregunta('${q.id}')"><span style="flex:1">${esc(q.texto)}</span><small>${esc(TIPOS_RESPUESTA[q.tipo]?.l||q.tipo)}</small></button>`).join(''):'<div class="tf-vacio">Agrega las preguntas que responderán los colaboradores.</div>'}</div>
      <div class="tf-tit"><span>Respuestas recientes</span><div><button class="btn sm" onclick="recargarRespuestas('${f.id}')">↻ Actualizar</button> <button class="btn sm" onclick="exportarRespuestas('${f.id}')" ${rs.length?'':'disabled'}>⬇ Excel CSV</button></div></div>
      <div class="tf-lista">${rs.length?[...rs].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,20).map(r=>`<div class="tf-paso"><span style="flex:1"><b>${esc(r.nombre||'Respuesta')}</b><small style="display:block">${esc(r.documento||'Sin documento')} · ${fechaTxt((r.created_at||'').slice(0,10))}</small></span>
        <button class="btn sm" onclick="respuestaATarea('${r.id}')">+ Tarea</button><button class="btn sm" onclick="respuestaANovedad('${r.id}')">+ Novedad</button></div>`).join(''):'<div class="tf-vacio">Aún no hay respuestas.</div>'}</div>
    </div><div class="modal-f"><button class="btn peligro" onclick="eliminarFormulario('${f.id}')">Eliminar</button><button class="btn" onclick="closeModal()">Cerrar</button></div>`,'modal-proyecto');
}

async function copiarLinkFormulario(id){const f=S.formularios.find(x=>x.id===id);await navigator.clipboard.writeText(urlFormulario(f));toast('Enlace copiado');}
async function recargarRespuestas(id){if(NUBE){const {data,error}=await sb.from('respuestas').select('*').eq('formulario_id',id);if(error){toast(error.message);return;}S.respuestas=S.respuestas.filter(r=>r.formulario_id!==id).concat(data||[]);}verFormularioAdmin(id);toast('Respuestas actualizadas');}

function exportarRespuestas(id){
  const f=S.formularios.find(x=>x.id===id),qs=preguntasForm(id),rs=respuestasForm(id),sep=';';
  const cel=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const filas=[['Fecha','Nombre','Documento',...qs.map(q=>q.texto)],...rs.map(r=>[r.created_at,r.nombre,r.documento,...qs.map(q=>Array.isArray(r.datos?.[q.id])?r.datos[q.id].join(', '):r.datos?.[q.id])])];
  const blob=new Blob(['\ufeff'+filas.map(x=>x.map(cel).join(sep)).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`${f.nombre.replace(/[^a-z0-9]+/gi,'_')}_respuestas.csv`;a.click();URL.revokeObjectURL(a.href);
}

async function respuestaATarea(id){const r=S.respuestas.find(x=>x.id===id),f=S.formularios.find(x=>x.id===r.formulario_id);await db.insert('tareas',{titulo:`Revisar respuesta de ${r.nombre||r.documento||'formulario'}`,cliente_id:null,proyecto_id:f.proyecto_id,prioridad:'media',estado:'pendiente',vence:hoyISO(),notas:`Respuesta del formulario ${f.nombre}. Documento: ${r.documento||'No informado'}`,checklist:[],seguimiento:[],adjuntos:[]});toast('Tarea creada');}
async function respuestaANovedad(id){const r=S.respuestas.find(x=>x.id===id),f=S.formularios.find(x=>x.id===r.formulario_id);await db.insert('novedades',{fecha:hoyISO(),titulo:`Revisar novedad de ${r.nombre||r.documento||'formulario'}`,detalle:`Originada en ${f.nombre}. Documento: ${r.documento||'No informado'}`,cliente_id:null,criticidad:'media',estado:'abierta',seguimiento:[],evidencias:[]});toast('Novedad creada');}

function eliminarFormulario(id){const f=S.formularios.find(x=>x.id===id);confirmarPeligro('¿Eliminar este formulario?',`Se eliminarán "${f.nombre}", sus preguntas y todas sus respuestas.`,async()=>{await db.remove('formularios',id);S.preguntas=S.preguntas.filter(q=>q.formulario_id!==id);S.respuestas=S.respuestas.filter(r=>r.formulario_id!==id);if(!NUBE)save();render();toast('Formulario eliminado');});}
