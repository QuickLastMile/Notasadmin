/* FICHA AMPLIA DE CLIENTE — operación, equipo y archivo documental privado. */
const CLIENTE_DOCS_KEY='__documentos_cliente';
const CARPETAS_CLIENTE_BASE=[
  {id:'contratos',nombre:'Contratos',icono:'📁'},
  {id:'imagenes',nombre:'Imágenes y evidencias',icono:'🖼️'},
  {id:'informes',nombre:'Informes y Excel',icono:'📊'},
  {id:'otros',nombre:'Otros documentos',icono:'🗂️'}
];
const docsCliente=c=>c?.campos?.[CLIENTE_DOCS_KEY]||{carpetas:[],archivos:[]};
const carpetasCliente=c=>[...CARPETAS_CLIENTE_BASE,...docsCliente(c).carpetas.filter(x=>!CARPETAS_CLIENTE_BASE.some(b=>b.id===x.id))];

async function guardarDocsCliente(c,docs){
  await db.update('clientes',c.id,{campos:{...(c.campos||{}),[CLIENTE_DOCS_KEY]:docs}});
}

function verCliente(id){
  const c=S.clientes.find(x=>x.id===id);if(!c)return;
  const tareas=S.tareas.filter(x=>x.cliente_id===id),pend=tareas.filter(x=>!['hecho','cancelada'].includes(x.estado));
  const proyectos=S.proyectos.filter(x=>x.cliente_id===id),novedades=S.novedades.filter(x=>x.cliente_id===id);
  const equipo=S.colaboradores.filter(x=>x.cliente_id===id),gastos=S.caja.filter(x=>x.cliente_id===id&&x.tipo==='gasto');
  const d=docsCliente(c),dato=(k,v)=>v?`<div class="ficha-fila"><span>${k}</span><strong>${esc(v)}</strong></div>`:'';
  openModal(`
    <div class="modal-h"><div style="min-width:0;flex:1"><h3>${esc(c.nombre)}</h3><small style="color:var(--text-3)">Ficha integral del cliente</small></div>
      <button class="btn sm" onclick="closeModal();modalCliente('${c.id}')">✎ Editar</button><button class="btn sm" onclick="closeModal()">✕</button></div>
    <div class="modal-b cliente-ficha-body">
      <div class="cliente-resumen">
        ${[[pend.length,'Tareas pendientes'],[proyectos.length,'Proyectos'],[novedades.filter(x=>x.estado!=='cerrada').length,'Novedades abiertas'],[equipo.length,'Equipo Quick'],[cop(suma(gastos,x=>x.monto)),'Gasto']].map(([v,l])=>`<div><strong>${v}</strong><span>${l}</span></div>`).join('')}
      </div>
      <div class="cliente-dos-columnas">
        <section><div class="tf-tit"><span>Información importante</span></div><div class="ficha">
          ${dato('NIT',c.nit)}${dato('CECO',c.ceco)}${dato('Contacto del cliente',c.contacto)}${dato('Estado',c.activo===false?'Inactivo':'Activo')}
        </div>${c.notas?`<div class="tf-notas" style="margin-top:10px">${esc(c.notas)}</div>`:''}</section>
        <section><div class="tf-tit"><span>Equipo Quick asignado</span><button class="btn sm pri" onclick="closeModal();modalColaborador(null,'${c.id}')">+ Agregar</button></div>
          <div class="cliente-equipo">${equipo.length?equipo.map(x=>`<button onclick="closeModal();modalColaborador('${x.id}')"><strong>${esc(x.nombre)}</strong><small>${esc(x.cargo||'Sin cargo')} · ${esc(x.celular||x.correo||'Sin contacto')}</small></button>`).join(''):'<div class="tf-vacio">Sin personal Quick asignado</div>'}</div></section>
      </div>
      ${archivoDocumentalCliente(c)}
      <div class="cliente-dos-columnas">
        <section><div class="tf-tit"><span>Proyectos</span><span class="chip n">${proyectos.length}</span></div><div class="tf-lista">${proyectos.length?proyectos.slice(0,6).map(p=>`<button class="tf-paso" onclick="closeModal();verProyecto('${p.id}')"><span>${esc(p.nombre)}</span><span class="chip n">${p.avance||0}%</span></button>`).join(''):'<div class="tf-vacio">Sin proyectos</div>'}</div></section>
        <section><div class="tf-tit"><span>Novedades recientes</span><span class="chip n">${novedades.length}</span></div><div class="tf-lista">${novedades.length?novedades.slice(0,6).map(n=>`<button class="tf-paso" onclick="closeModal();verNovedad('${n.id}')"><span>${esc(n.titulo)}</span><span class="chip ${n.estado==='cerrada'?'o':'w'}">${esc(n.estado)}</span></button>`).join(''):'<div class="tf-vacio">Sin novedades</div>'}</div></section>
      </div>
    </div>
    <div class="modal-f"><button class="btn" onclick="closeModal()">Cerrar</button><button class="btn pri" onclick="closeModal();modalTareaCliente('${c.id}')">+ Nueva tarea</button></div>`,'modal-cliente');
}

function modalTareaCliente(clienteId){modalTarea();requestAnimationFrame(()=>{const s=$('#mC');if(s){s.value=clienteId;sincronizarCeco();}});}

function archivoDocumentalCliente(c){
  const d=docsCliente(c);return `<section><div class="tf-tit"><span>Archivo documental</span><span class="chip n">${d.archivos.length} archivo${d.archivos.length===1?'':'s'}</span></div>
    <p class="cliente-ayuda">Organiza contratos, anexos, imágenes, informes, hojas de cálculo y demás información clave del cliente.</p>
    <div class="proy-doc-acciones"><button class="btn sm" onclick="modalCarpetaCliente('${c.id}')">＋ Nueva carpeta</button></div>
    <div class="proy-folder-grid">${carpetasCliente(c).map(f=>{const n=d.archivos.filter(a=>a.carpeta_id===f.id).length;return `<div class="proy-folder-card"><button onclick="abrirCarpetaCliente('${c.id}','${f.id}')"><span class="proy-folder-icon">${f.icono||'📁'}</span><strong>${esc(f.nombre)}</strong><small>${n} archivo${n===1?'':'s'}</small></button>${CARPETAS_CLIENTE_BASE.some(x=>x.id===f.id)?'':`<button class="btn sm dgr" onclick="eliminarCarpetaCliente('${c.id}','${f.id}')">✕</button>`}</div>`}).join('')}</div></section>`;
}

function modalCarpetaCliente(id){openModal(formModal('Nueva carpeta',`<div><label>Nombre</label><input id="clCarpetaNombre" placeholder="Ej. Actas o Pólizas"></div>`,`crearCarpetaCliente('${id}')`,'Crear carpeta'));}
async function crearCarpetaCliente(id){const c=S.clientes.find(x=>x.id===id),nombre=$('#clCarpetaNombre').value.trim();if(!nombre)return toast('Escribe el nombre');const d=docsCliente(c);d.carpetas.push({id:uid(),nombre,icono:'📁'});await guardarDocsCliente(c,d);closeModal();verCliente(id);toast('Carpeta creada');}
function elegirArchivoCliente(id,carpeta){const i=$('#archivoClienteInput');if(i){i.dataset.cliente=id;i.dataset.carpeta=carpeta;i.click();}}
async function subirArchivoCliente(input){const file=input.files?.[0],c=S.clientes.find(x=>x.id===input.dataset.cliente);if(!file||!c)return;toast('Subiendo archivo…');const ref=await guardarDocumentoCliente(file,c.id);input.value='';if(!ref)return;const d=docsCliente(c);d.archivos.push({id:uid(),carpeta_id:input.dataset.carpeta,nombre:file.name,tipo:file.type||'',tamano:file.size,ref,created_at:new Date().toISOString()});await guardarDocsCliente(c,d);abrirCarpetaCliente(c.id,input.dataset.carpeta);toast('Archivo agregado ✓');}
function archivoClienteHTML(c,a,carpeta){const imagen=esImagen(a.ref,a.tipo);return `<div class="proy-item"><button class="proy-preview" onclick="verArchivo('${esc(a.ref)}','${esc(a.nombre)}','${esc(a.nombre)}')">${imagen?`<img data-doc-ref="${esc(a.ref)}" alt="${esc(a.nombre)}"><span class="proy-preview-carga">◌</span>`:`<span>${iconoDocumento(a)}</span>`}</button><div class="proy-item-info"><strong>${esc(a.nombre)}</strong><small>${tamanoDoc(a.tamano||0)} · ${fechaCorta((a.created_at||'').slice(0,10))}</small></div><button class="btn sm dgr proy-item-borrar" onclick="eliminarArchivoCliente('${c.id}','${a.id}','${carpeta}')">✕</button></div>`;}
function abrirCarpetaCliente(id,carpeta){const c=S.clientes.find(x=>x.id===id),d=docsCliente(c),f=carpetasCliente(c).find(x=>x.id===carpeta),arch=d.archivos.filter(x=>x.carpeta_id===carpeta);if(!c||!f)return;openModal(`<div class="modal-h"><button class="btn sm" onclick="closeModal();verCliente('${id}')">← Cliente</button><h3 style="flex:1">${f.icono||'📁'} ${esc(f.nombre)}</h3><span class="chip n">${arch.length}</span><button class="btn sm pri" onclick="elegirArchivoCliente('${id}','${carpeta}')">⬆ Subir</button><button class="btn sm" onclick="closeModal()">✕</button></div><div class="modal-b"><input id="archivoClienteInput" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip" hidden data-cliente="${id}" data-carpeta="${carpeta}" onchange="subirArchivoCliente(this)"><div class="proy-explorer vista-mediana">${arch.length?arch.map(a=>archivoClienteHTML(c,a,carpeta)).join(''):'<div class="tf-vacio">Carpeta vacía. Sube el primer archivo.</div>'}</div></div>`,'modal-cliente');setTimeout(cargarMiniaturasProyecto,0);}
async function eliminarArchivoCliente(id,archivoId,carpeta){const c=S.clientes.find(x=>x.id===id),d=docsCliente(c),a=d.archivos.find(x=>x.id===archivoId);if(!a)return;confirmarPeligro('¿Eliminar este archivo?',a.nombre,async()=>{await borrarArchivo(a.ref);d.archivos=d.archivos.filter(x=>x.id!==archivoId);await guardarDocsCliente(c,d);abrirCarpetaCliente(id,carpeta);toast('Archivo eliminado');});}
function eliminarCarpetaCliente(id,carpeta){const c=S.clientes.find(x=>x.id===id),d=docsCliente(c),f=d.carpetas.find(x=>x.id===carpeta),arch=d.archivos.filter(x=>x.carpeta_id===carpeta);if(!f)return;confirmarPeligro('¿Eliminar esta carpeta?',`Se eliminará ${f.nombre} y ${arch.length} archivo(s).`,async()=>{for(const a of arch)await borrarArchivo(a.ref);d.archivos=d.archivos.filter(x=>x.carpeta_id!==carpeta);d.carpetas=d.carpetas.filter(x=>x.id!==carpeta);await guardarDocsCliente(c,d);verCliente(id);});}
