/* ============================================================================
   VISTA: TAREAS
   ========================================================================== */

let fTarea = 'todas';   // filtro activo

const FILTROS_TAREA = {
  todas:    t => t.estado !== 'hecho',
  vencidas: t => t.estado !== 'hecho' && t.vence && diasDesde(t.vence) <  0,
  hoy:      t => t.estado !== 'hecho' && t.vence && diasDesde(t.vence) === 0,
  semana:   t => t.estado !== 'hecho' && t.vence && diasDesde(t.vence) > 0 && diasDesde(t.vence) <= 7,
  hechas:   t => t.estado === 'hecho'
};

function setFiltroTarea(f){ fTarea = f; render(); }

function vTareas(m){
  const lista = S.tareas
    .filter(FILTROS_TAREA[fTarea])
    .sort((a, b) => (a.vence || '9999') < (b.vence || '9999') ? -1 : 1);

  const tabs = [
    ['todas',    `Todas (${S.tareas.filter(FILTROS_TAREA.todas).length})`],
    ['vencidas', `Vencidas (${m.vencidas.length})`],
    ['hoy',      `Hoy (${m.hoy.length})`],
    ['semana',   `Esta semana (${m.semana.length})`],
    ['hechas',   'Hechas']
  ];

  return `
  ${pageHead('Tareas',
    'Nada se pierde: captura arriba con <code>t:</code> y aparece aquí.',
    `<button class="btn pri" onclick="modalTarea()">+ Nueva tarea</button>`)}

  <div class="tabs">
    ${tabs.map(([k, l]) =>
      `<button class="tab ${fTarea === k ? 'active' : ''}" onclick="setFiltroTarea('${k}')">${l}</button>`
    ).join('')}
  </div>

  <div class="card"><div class="card-b flush">
    ${lista.length ? lista.map(rowTarea).join('') : vacio('📭', 'No hay tareas en este filtro')}
  </div></div>`;
}
