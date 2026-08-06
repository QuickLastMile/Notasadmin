/* ============================================================================
   VISTA: CLIENTES — ficha resumida por cliente
   ========================================================================== */

function vClientes(){
  return `
  ${pageHead('Clientes',
    'Ficha por cliente: qué le debes, cuánto has gastado y qué se dañó.',
    `<button class="btn pri" onclick="modalCliente()">+ Nuevo cliente</button>`)}

  <div class="grid g2">
    ${S.clientes.map(c => {
      const tks = S.tareas.filter(t => t.cliente_id === c.id && t.estado !== 'hecho');
      const ven = tks.filter(t => t.vence && diasDesde(t.vence) < 0).length;
      const prs = S.proyectos.filter(p => p.cliente_id === c.id && p.estado !== 'hecho');
      const gas = suma(S.caja.filter(g => g.tipo === 'gasto' && g.cliente_id === c.id), g => g.monto);
      const nov = S.novedades.filter(n => n.cliente_id === c.id && n.estado === 'abierta').length;

      const mini = (valor, etiqueta, color = 'inherit') => `
        <div>
          <div style="font-size:18px;font-weight:700;color:${color}">${valor}</div>
          <div style="font-size:10.5px;color:var(--text-3)">${etiqueta}</div>
        </div>`;

      return `
      <div class="card">
        <div class="card-h">
          <h2><span class="dot" style="background:${c.color}"></span>${esc(c.nombre)}</h2>
          ${ven ? `<span class="chip d">${ven} vencida${ven > 1 ? 's' : ''}</span>`
                : `<span class="chip o">Al día</span>`}
        </div>
        <div class="card-b">
          <p style="font-size:12px;color:var(--text-2);margin-bottom:11px">${esc(c.contacto || '—')}</p>
          <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
            ${mini(tks.length, 'Tareas')}
            ${mini(prs.length, 'Proyectos')}
            ${mini(nov, 'Novedades', nov ? 'var(--danger)' : 'inherit')}
            <div>
              <div style="font-size:14px;font-weight:700">${cop(gas)}</div>
              <div style="font-size:10.5px;color:var(--text-3)">Gasto</div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
