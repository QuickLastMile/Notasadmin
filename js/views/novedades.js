/* ============================================================================
   VISTA: NOVEDADES — bitácora de lo que se sale del guion
   ========================================================================== */

function filaNovedad(n){
  const abierta = n.estado === 'abierta';
  return `
  <div class="row">
    <span class="dot" style="width:9px;height:9px;background:${colorNivel(n.criticidad)}"></span>
    <div class="row-main">
      <div class="row-t">${esc(n.titulo)}
        <span class="chip ${n.criticidad === 'alta' ? 'd' : n.criticidad === 'media' ? 'w' : 'n'}">
          ${esc(n.criticidad)}</span>
      </div>
      <div class="row-s">
        <span>${cliTag(n.cliente_id)}</span>
        <span>${fechaTxt(n.fecha)}</span>
        ${n.detalle ? `<span>${esc(n.detalle)}</span>` : ''}
      </div>
      ${n.accion ? `<div style="font-size:11.5px;color:var(--brand);margin-top:3px">→ ${esc(n.accion)}</div>` : ''}
    </div>
    ${abierta ? `
      <button class="btn sm" onclick="novedadATarea('${n.id}')" title="Crear tarea para hoy">→ Tarea</button>
      <button class="btn sm" onclick="cerrarNovedad('${n.id}')">Cerrar</button>`
      : `<span class="chip o">Cerrada</span>`}
  </div>`;
}

function vNovedades(){
  const porFecha = (a, b) => b.fecha < a.fecha ? -1 : 1;
  const abiertas = S.novedades.filter(n => n.estado === 'abierta').sort(porFecha);
  const cerradas = S.novedades.filter(n => n.estado === 'cerrada').sort(porFecha);

  return `
  ${pageHead('Novedades del día',
    'Todo lo que se sale del guion queda registrado, con su acción y responsable.',
    `<button class="btn pri" onclick="modalNovedad()">+ Registrar novedad</button>`)}

  <div class="grid g2">
    <div class="card span-all">
      <div class="card-h"><h2>🔴 Abiertas</h2><span class="chip d">${abiertas.length}</span></div>
      <div class="card-b flush">
        ${abiertas.length ? abiertas.map(filaNovedad).join('') : vacio('🟢', 'Ninguna novedad abierta')}
      </div>
    </div>

    <div class="card span-all">
      <div class="card-h"><h2>✅ Cerradas</h2><span class="chip n">${cerradas.length}</span></div>
      <div class="card-b flush">
        ${cerradas.length ? cerradas.map(filaNovedad).join('') : vacio('📭', 'Aún no hay cerradas')}
      </div>
    </div>
  </div>`;
}
