/* ============================================================================
   VISTA: CAJA MENOR — arqueo en vivo
   ========================================================================== */

function vCaja(m){
  const gastos = S.caja.filter(g => g.tipo === 'gasto');

  // Agrupación por categoría
  const porCat = {};
  gastos.forEach(g => porCat[g.categoria] = (porCat[g.categoria] || 0) + g.monto);
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;

  // Agrupación por cliente
  const porCli = S.clientes
    .map(c => ({ c, v: suma(gastos.filter(g => g.cliente_id === c.id), g => g.monto) }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v);

  const movs = [...S.caja].sort((a, b) => b.fecha < a.fecha ? -1 : 1);
  const colorConsumo = m.pctUsado >= .85 ? 'var(--danger)'
                     : m.pctUsado >= .75 ? 'var(--warn)' : 'var(--ok)';

  return `
  ${pageHead('Caja menor',
    'Arqueo en vivo. Marca el soporte al registrar y no habrá sorpresas al legalizar.',
    `<button class="btn" onclick="modalCaja('ingreso')">+ Ingreso</button>
     <button class="btn pri" onclick="modalCaja('gasto')">+ Gasto</button>`)}

  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Base recibida', cop(m.ing), 'Ingresos del período', 'o')}
    ${kpi('Gastado', cop(m.gas), `${gastos.length} movimientos`, 'd')}
    ${kpi('Saldo disponible', cop(m.saldo), `${Math.round((1 - m.pctUsado) * 100)}% de la base`,
          m.saldo < m.ing * 0.25 ? 'w' : 'p')}
    ${kpi('Sin legalizar', cop(m.montoSinLeg),
          `${m.sinLegalizar.length} movimientos · ${m.sinSoporte.length} sin soporte`,
          m.sinLegalizar.length ? 'w' : 'o')}
  </div>

  <!-- Consumo de la base -->
  <div class="card" style="margin-bottom:14px"><div class="card-b">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
      <span style="color:var(--text-2)">Consumo de la base</span>
      <strong>${Math.round(m.pctUsado * 100)}%</strong>
    </div>
    ${barra(m.pctUsado * 100, colorConsumo)}
    ${m.pctUsado >= CFG.topeAlertaCaja ? `
      <p style="font-size:12px;color:var(--warn);margin-top:8px">
        ⚠️ Superaste el ${Math.round(CFG.topeAlertaCaja * 100)}%: es momento de tramitar el reembolso.
      </p>` : ''}
  </div></div>

  <div class="grid g2">

    <!-- Movimientos -->
    <div class="card span-all">
      <div class="card-h"><h2>Movimientos</h2><span class="chip n">${movs.length}</span></div>
      <div class="card-b flush scroll-x">
        <table>
          <thead><tr>
            <th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Cliente</th>
            <th class="num">Monto</th><th>Soporte</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
          ${movs.map(g => `
            <tr>
              <td style="white-space:nowrap;color:var(--text-2)">${fechaTxt(g.fecha)}</td>
              <td>${esc(g.concepto)}</td>
              <td><span class="chip n">${esc(g.categoria)}</span></td>
              <td>${cliTag(g.cliente_id)}</td>
              <td class="num" style="font-weight:600;color:${g.tipo === 'ingreso' ? 'var(--ok)' : 'var(--text)'}">
                ${g.tipo === 'ingreso' ? '+' : '−'} ${cop(g.monto)}</td>
              <td>${g.tipo === 'gasto'
                    ? (g.soporte ? '<span class="chip o">📎 Sí</span>' : '<span class="chip d">Falta</span>')
                    : '—'}</td>
              <td>${g.tipo === 'gasto'
                    ? `<button class="chip ${g.legalizado ? 'o' : 'w'}" onclick="toggleLeg('${g.id}')">
                         ${g.legalizado ? 'Legalizado' : 'Pendiente'}</button>`
                    : '<span class="chip n">Base</span>'}</td>
              <td><button class="btn sm dgr" onclick="borrar('caja','${g.id}')">✕</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Por categoría -->
    <div class="card">
      <div class="card-h"><h2>Gasto por categoría</h2></div>
      <div class="card-b" style="display:grid;gap:11px">
        ${cats.length ? cats.map(([c, v]) => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
              <span>${esc(c)}</span><strong class="num">${cop(v)}</strong>
            </div>
            ${barra(v / maxCat * 100)}
          </div>`).join('') : vacio('📊', 'Sin gastos registrados')}
      </div>
    </div>

    <!-- Por cliente -->
    <div class="card">
      <div class="card-h"><h2>Gasto por cliente</h2></div>
      <div class="card-b" style="display:grid;gap:11px">
        ${porCli.length ? porCli.map(({ c, v }) => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
              <span><span class="dot dot-i" style="background:${c.color}"></span>${esc(c.nombre)}</span>
              <strong class="num">${cop(v)}</strong>
            </div>
            ${barra(v / m.gas * 100, c.color)}
          </div>`).join('') : vacio('📊', 'Sin gastos registrados')}
      </div>
    </div>

  </div>`;
}
