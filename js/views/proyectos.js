/* ============================================================================
   VISTA: PROYECTOS
   ========================================================================== */

function vProyectos(){
  if(!S.proyectos.length) return `
    ${pageHead('Proyectos', 'Un lugar para saber en qué va cada entregable y de quién es.', '')}
    ${vacioCTA('▣', 'Aún no tienes proyectos',
      'Un proyecto agrupa tareas y tiene cliente, avance y fecha de entrega.',
      '+ Nuevo proyecto', 'modalProyecto()')}`;

  return `
  ${pageHead('Proyectos',
    'Un lugar para saber en qué va cada entregable y de quién es.',
    `<button class="btn pri" onclick="modalProyecto()">+ Nuevo proyecto</button>`)}

  <div class="grid g2">
    ${S.proyectos.map(p => {
      const c   = cli(p.cliente_id);
      const est = EST_PROYECTO[p.estado] || EST_PROYECTO.en_curso;
      const ap  = avanceProyecto(p);
      const tks = ap.tareas;
      const ok  = ap.hechas;
      const d   = p.vence ? diasDesde(p.vence) : null;

      return `
      <div class="card" role="button" tabindex="0" onclick="verProyecto('${p.id}')"
           onkeydown="if(event.key==='Enter')verProyecto('${p.id}')" style="cursor:pointer">
        <div class="card-h">
          <h2><span class="dot" style="background:${c.color}"></span>${esc(p.nombre)}</h2>
          <span class="chip ${est.c}">${est.l}</span>
        </div>
        <div class="card-b">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-2);margin-bottom:5px">
            <span>${esc(c.nombre)}</span><strong>${ap.avance}%</strong>
          </div>
          <div style="margin-bottom:11px">${barra(ap.avance, c.color)}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span class="chip n">✓ ${ok}/${tks.length} tareas</span>
            <span class="chip n">${ap.automatico ? 'Avance automático' : 'Avance manual'}</span>
            ${p.vence ? `<span class="chip ${d < 0 ? 'd' : d < 3 ? 'w' : 'n'}">Vence ${fechaTxt(p.vence)}</span>` : ''}
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
