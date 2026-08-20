/* VISTA: NOTAS */
let notaBuscar='', notaCarpeta='todas', notaEtiqueta='todas';

function notaTexto(html){const d=document.createElement('div');d.innerHTML=html||'';return (d.textContent||'').trim();}
function notaFecha(n){return new Date(n.updated_at||n.created_at||Date.now()).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'2-digit'});}
function carpetaNota(id){return S.notas_carpetas.find(x=>x.id===id);}
function filtrarNotas(){
  const q=notaBuscar.toLowerCase().trim();
  return [...S.notas].filter(n=>(notaCarpeta==='todas'||(notaCarpeta==='sin'?!n.carpeta_id:n.carpeta_id===notaCarpeta))
    &&(notaEtiqueta==='todas'||(n.etiquetas||[]).includes(notaEtiqueta))
    &&(!q||[n.titulo,notaTexto(n.contenido),...(n.etiquetas||[])].join(' ').toLowerCase().includes(q)))
    .sort((a,b)=>(b.anclada-a.anclada)||String(b.updated_at||b.created_at).localeCompare(String(a.updated_at||a.created_at)));
}
function buscarNotasAhora(v){notaBuscar=v;render();const i=$('#buscarNotas');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}}
function setCarpetaNotas(id){notaCarpeta=id;render();}
function setEtiquetaNotas(v){notaEtiqueta=v;render();}

function vNotas(){
  if(NUBE && window.TABLAS_OPCIONALES_FALTANTES?.some(x=>x.startsWith('notas'))) return `${pageHead('Notas','Ideas, apuntes, documentos y recordatorios en un solo lugar.','')}
    <div class="card"><div class="card-b nota-falta"><span>🗒️</span><h2>Falta activar Notas en Supabase</h2><p>Ejecuta el archivo <code>sql/23-notas.sql</code> en Supabase → SQL Editor y recarga esta página.</p></div></div>`;
  const notas=filtrarNotas();
  const etiquetas=[...new Set(S.notas.flatMap(n=>n.etiquetas||[]))].sort();
  const acciones=`<button class="btn" onclick="modalCarpetaNota()">📁 Nueva carpeta</button><button class="btn pri" onclick="editarNota()">+ Nueva nota</button>`;
  return `${pageHead('Notas','Escribe, organiza, ancla y convierte tus ideas en acciones.',acciones)}
    <div class="notas-barra">
      <div class="cfg-buscar"><span>${ICO.buscar}</span><input id="buscarNotas" value="${esc(notaBuscar)}" placeholder="Buscar por título, texto o etiqueta…" oninput="buscarNotasAhora(this.value)"></div>
      <select onchange="setCarpetaNotas(this.value)"><option value="todas">Todas las carpetas</option><option value="sin" ${notaCarpeta==='sin'?'selected':''}>Sin carpeta</option>${S.notas_carpetas.map(f=>`<option value="${f.id}" ${notaCarpeta===f.id?'selected':''}>${esc(f.nombre)}</option>`).join('')}</select>
      <select onchange="setEtiquetaNotas(this.value)"><option value="todas">Todas las etiquetas</option>${etiquetas.map(t=>`<option ${notaEtiqueta===t?'selected':''}>${esc(t)}</option>`).join('')}</select>
    </div>
    ${S.notas_carpetas.length?`<div class="notas-carpetas">${S.notas_carpetas.map(f=>`<button class="nota-carpeta ${notaCarpeta===f.id?'activa':''}" onclick="setCarpetaNotas('${f.id}')"><span style="--fc:${f.color}">📁</span><b>${esc(f.nombre)}</b><small>${S.notas.filter(n=>n.carpeta_id===f.id).length}</small></button>`).join('')}</div>`:''}
    <div class="notas-grid">${notas.length?notas.map(tarjetaNota).join(''):vacioCTA('🗒️','No hay notas con estos filtros','Crea una nota para guardar la primera idea.','+ Crear nota','editarNota()')}</div>`;
}

function tarjetaNota(n){const carpeta=carpetaNota(n.carpeta_id),txt=notaTexto(n.contenido);return `<article class="nota-card" style="--nota-color:${esc(n.color||'#FFF7DF')}" onclick="verNota('${n.id}')">
  <div class="nota-card-top"><span>${n.anclada?'📌':'🗒️'}</span><small>${notaFecha(n)}</small><button title="${n.anclada?'Desanclar':'Anclar'}" onclick="event.stopPropagation();anclarNota('${n.id}')">${n.anclada?'📌':'☆'}</button></div>
  <h2>${esc(n.titulo||'Sin título')}</h2><p>${esc(txt||'Nota sin texto')}</p>
  <div class="nota-card-pie">${carpeta?`<span>📁 ${esc(carpeta.nombre)}</span>`:''}${(n.etiquetas||[]).slice(0,3).map(t=>`<span>#${esc(t)}</span>`).join('')}${n.recordatorio?'<span>🔔</span>':''}</div></article>`;}
