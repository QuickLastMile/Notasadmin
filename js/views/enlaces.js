/* ============================================================================
   VISTA: DASHBOARDS Y ENLACES — tu índice de accesos
   ========================================================================== */

function vEnlaces(){
  if(!S.dashboards.length) return `
    ${pageHead('Dashboards y enlaces', 'Tu índice de accesos.', '')}
    ${vacioCTA('◈', 'Sin enlaces guardados',
      'Captura arriba con "l: https://... Nombre del dashboard" y queda en el índice.',
      '⚡ Ir a capturar', "$('#cap').focus()")}`;

  return `
  ${pageHead('Dashboards y enlaces',
    'Tu índice de accesos. Captura con <code>l:</code> + la URL.',
    `<button class="btn pri" onclick="$('#cap').focus()">+ Agregar enlace</button>`)}

  <div class="card"><div class="card-b flush">
    ${S.dashboards.length ? S.dashboards.map(d => `
      <div class="row">
        <span class="dot" style="width:9px;height:9px;background:${cli(d.cliente_id).color}"></span>
        <div class="row-main">
          <div class="row-t">${esc(d.nombre)}</div>
          <div class="row-s">
            <span>${esc(cli(d.cliente_id).nombre)}</span>
            <span style="font-family:var(--mono)">${esc(d.url)}</span>
          </div>
        </div>
        <a class="btn sm" href="${esc(d.url)}" target="_blank" rel="noopener">Abrir ↗</a>
        <button class="btn sm dgr" onclick="borrar('dashboards','${d.id}')">✕</button>
      </div>`).join('') : vacio('🔗', 'Aún no has guardado enlaces')}
  </div></div>`;
}
