/* FORMULARIO PÚBLICO — no requiere cuenta */
let formularioPublicoActual=null, preguntasPublicas=[];

function controlPreguntaPublica(q){
  const id=`pub_${q.id}`, req=q.obligatoria?'required':'';
  const attrs=`id="${id}" data-q="${q.id}" ${req}`;
  if(q.tipo==='texto') return `<input ${attrs} type="text" autocomplete="off">`;
  if(q.tipo==='numero') return `<input ${attrs} type="number">`;
  if(q.tipo==='fecha') return `<input ${attrs} type="date">`;
  if(q.tipo==='hora') return `<input ${attrs} type="time">`;
  if(q.tipo==='sino') return `<select ${attrs}><option value="">Selecciona…</option><option>Sí</option><option>No</option></select>`;
  if(q.tipo==='unica') return `<select ${attrs}><option value="">Selecciona…</option>${(q.opciones||[]).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`;
  if(q.tipo==='multiple') return `<div class="pub-opciones" data-q="${q.id}">${(q.opciones||[]).map(o=>`<label><input type="checkbox" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div>`;
  if(q.tipo==='archivo') return `<div class="pub-ayuda">La carga de archivos estará disponible en una siguiente versión. Puedes solicitar un enlace mediante una pregunta de texto.</div>`;
  return `<input ${attrs} type="text">`;
}

async function mostrarFormularioPublico(token){
  if(!NUBE||!sb){document.body.innerHTML='<div class="pub-page"><div class="pub-card"><div class="pub-enviado"><h2>Formulario no disponible</h2></div></div></div>';return;}
  const {data:f,error}=await sb.from('formularios').select('*').eq('public_token',token).single();
  if(error||!f){document.body.innerHTML='<div class="pub-page"><div class="pub-card"><div class="pub-enviado"><h2>Este formulario no está disponible</h2><p>Puede estar cerrado, vencido o el enlace no es válido.</p></div></div></div>';return;}
  const {data:qs,error:qe}=await sb.from('preguntas').select('*').eq('formulario_id',f.id).eq('activa',true).order('orden');
  if(qe){document.body.innerHTML='<div class="pub-page"><div class="pub-card"><div class="pub-enviado"><h2>No se pudieron cargar las preguntas</h2></div></div></div>';return;}
  formularioPublicoActual=f;preguntasPublicas=qs||[];
  const bloqueado=!f.permitir_repetidas&&localStorage.getItem('form_enviado_'+f.id);
  const respondibles=preguntasPublicas.filter(q=>q.tipo!=='encabezado').length;
  document.body.innerHTML=`<div class="pub-page"><div class="pub-brand ${respondibles<=2?'pub-corta':''}">${logoNexa(34,'pub')}<div><b>NEXA</b><small>Formulario público</small></div></div>
    <form class="pub-card ${respondibles<=2?'pub-corta':''}" id="formPublico" onsubmit="enviarFormularioPublico(event)">
      <div class="pub-head"><h1>${esc(f.nombre)}</h1>${f.descripcion?`<p>${esc(f.descripcion)}</p>`:''}</div>
      ${bloqueado?`<div class="pub-enviado"><span>✓</span><h2>Ya registramos una respuesta desde este dispositivo</h2><p>${esc(f.mensaje)}</p></div>`:
      `<input id="pubTrampa" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
       ${preguntasPublicas.length?preguntasPublicas.map((q,i)=>q.tipo==='encabezado'
         ? `<div class="pub-seccion"><h2>${esc(q.texto)}</h2></div>`
         : `<div class="pub-pregunta"><label for="pub_${q.id}"><span>${preguntasPublicas.slice(0,i+1).filter(x=>x.tipo!=='encabezado').length}</span>${esc(q.texto)}${q.obligatoria?'<b>*</b>':''}</label>${controlPreguntaPublica(q)}</div>`).join(''):'<div class="pub-ayuda">Este formulario todavía no tiene preguntas.</div>'}
       <div class="pub-privacidad">Al enviar autorizas el almacenamiento de las respuestas suministradas para la gestión del proyecto. No necesitas crear una cuenta.</div>
       <button class="btn pri pub-enviar" id="pubEnviar" ${preguntasPublicas.length?'':'disabled'}>Enviar respuestas</button>`}
    </form><div class="pub-foot">NEXA · Centro de Gestión</div></div>`;
}

function valorPreguntaPublica(q){
  if(q.tipo==='encabezado') return '';
  if(q.tipo==='multiple') return [...document.querySelectorAll(`[data-q="${q.id}"] input:checked`)].map(x=>x.value);
  if(q.tipo==='archivo') return '';
  const valor=document.getElementById(`pub_${q.id}`)?.value?.trim()||'';
  return q.tipo==='texto'?valor.toUpperCase():valor;
}

async function enviarFormularioPublico(e){
  e.preventDefault();if($('#pubTrampa')?.value)return;
  const datos={};let falta='';
  for(const q of preguntasPublicas){if(q.tipo==='encabezado')continue;const v=valorPreguntaPublica(q);datos[q.id]=v;if(q.obligatoria&&(!v||(Array.isArray(v)&&!v.length))&&!falta)falta=q.texto;}
  if(falta){toast('Falta responder: '+falta);return;}
  const buscar=pat=>{const q=preguntasPublicas.find(x=>pat.test(x.texto));return q?datos[q.id]:''};
  const nombre=String(buscar(/nombre/i)||''),documento=String(buscar(/c[eé]dula|documento|\bcc\b/i)||'');
  const b=$('#pubEnviar');b.disabled=true;b.textContent='Enviando…';
  const {error}=await sb.from('respuestas').insert({formulario_id:formularioPublicoActual.id,nombre,documento,datos});
  if(error){b.disabled=false;b.textContent='Enviar respuestas';toast('No se pudo enviar: '+error.message);return;}
  if(!formularioPublicoActual.permitir_repetidas)localStorage.setItem('form_enviado_'+formularioPublicoActual.id,'1');
  $('#formPublico').innerHTML=`<div class="pub-enviado"><span>✓</span><h2>Respuesta enviada</h2><p>${esc(formularioPublicoActual.mensaje)}</p></div>`;
}
