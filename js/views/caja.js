/* ============================================================================
   VISTA: CAJA MENOR
   Pagos a mensajeros y proveedores, con arqueo, legalización y reembolso.
   Pestañas: Movimientos · Mensajeros · Presupuesto · Períodos
   ========================================================================== */

let cajaTab   = 'movimientos';
let periodoSel = null;          // null = usa el período activo
let filtroCaja = 'todos';

const TABS_CAJA = [
  ['movimientos',  'Movimientos'],
  ['beneficiarios','Mensajeros'],
  ['presupuesto',  'Presupuesto'],
  ['periodos',     'Períodos']
];

const FILTROS_CAJA = {
  todos:         g => true,
  sinlegalizar:  g => g.tipo === 'gasto' && !g.legalizado,
  sinsoporte:    g => g.tipo === 'gasto' && (!g.tiene_comprobante || !g.tiene_factura),
  porcobrar:     g => g.tipo === 'gasto' && (g.monto - (g.reembolsado || 0)) > 0
};

function setCajaTab(t){ cajaTab = t; render(); }
function setPeriodoSel(id){ periodoSel = id; render(); }
function setFiltroCaja(f){ filtroCaja = f; render(); }

/* ========================================================================== */
function vCaja(){
  // Sin período no hay dónde registrar: primero se abre uno.
  if(!S.periodos.length) return `
    ${pageHead('Caja menor',
      'Pagos a mensajeros y gastos operativos: quién, a qué cuenta, con qué soporte y cuánto te devolvieron.', '')}
    <div class="card" style="max-width:560px">
      <div class="card-b" style="text-align:center;padding:34px 22px">
        <div style="font-size:34px;opacity:.5;margin-bottom:10px">▤</div>
        <h2 style="font-size:16px;margin-bottom:6px">Abre tu primer período de caja</h2>
        <p style="color:var(--text-2);font-size:13px;margin-bottom:16px">
          Un período es un mes de caja: se abre con la base que te asignaron,
          recibe los pagos y se cierra cuando legalizas.
        </p>
        <button class="btn pri" onclick="modalPeriodo()">+ Abrir período</button>
      </div>
    </div>`;

  const pid = periodoSel || periodoActivo()?.id;
  const p   = per(pid);
  const a   = arqueo(pid);

  const selectorPeriodo = `
    <select onchange="setPeriodoSel(this.value)" style="padding:7px 10px;border-radius:8px;
      border:1px solid var(--border);background:var(--surface);font-size:12.5px;font-weight:600">
      ${S.periodos.map(x => `<option value="${x.id}" ${x.id === pid ? 'selected' : ''}>
        ${esc(x.nombre)}${x.estado === 'cerrado' ? ' · cerrado' : ''}</option>`).join('')}
    </select>`;

  const acciones = `
    ${selectorPeriodo}
    <button class="btn" onclick="modalReembolso('${pid}')">💰 Reembolso</button>
    <button class="btn" onclick="modalCaja('ingreso')">+ Ingreso</button>
    <button class="btn pri" onclick="modalCaja('gasto')">+ Pago / gasto</button>`;

  const cuerpo = {
    movimientos:   () => tabMovimientos(a, p, pid),
    beneficiarios: () => tabBeneficiarios(),
    presupuesto:   () => tabPresupuesto(pid),
    periodos:      () => tabPeriodos()
  }[cajaTab]();

  return `
  ${pageHead('Caja menor',
    'Pagos a mensajeros y gastos operativos: quién, a qué cuenta, con qué soporte y cuánto te devolvieron.',
    acciones)}

  ${p && p.estado === 'cerrado' ? `
    <div class="alert w" style="margin-bottom:14px">
      <span>🔒</span>
      <div class="a-txt"><b>Período cerrado el ${fechaCorta(p.cerrado_el)}</b>
        <small>Estás viendo el histórico. Los movimientos nuevos van al período abierto.</small></div>
    </div>` : ''}

  ${tarjetasArqueo(a)}

  <div class="tabs">
    ${TABS_CAJA.map(([k, l]) =>
      `<button class="tab ${cajaTab === k ? 'active' : ''}" onclick="setCajaTab('${k}')">${l}</button>`
    ).join('')}
  </div>

  ${cuerpo}`;
}

/* ---- KPIs del arqueo ------------------------------------------------------ */
function tarjetasArqueo(a){
  const colorConsumo = a.pctUsado >= .85 ? 'var(--danger)'
                     : a.pctUsado >= .75 ? 'var(--warn)' : 'var(--ok)';
  return `
  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Base del período', cop(a.base), 'Lo que te asignaron', 'o')}
    ${kpi('Gastado', cop(a.gastado), `${a.gastos.length} movimientos`, 'd')}
    ${kpi('Saldo en caja', cop(a.saldo), `${Math.round((1 - a.pctUsado) * 100)}% de la base`,
          a.saldo < a.base * .25 ? 'w' : 'p')}
    ${kpi('Te reembolsaron', cop(a.reembolsado), 'Lo que realmente te pagaron', 'o')}
    ${kpi('Pendiente por cobrar', cop(a.pendiente),
          `${cop(a.cobrable)} ya cobrable · ${cop(a.trabado)} trabado`,
          a.pendiente > 0 ? 'w' : 'o')}
    ${kpi('Sin legalizar', cop(a.montoSinLeg),
          `${a.sinLegalizar.length} movimientos · ${a.sinSoporte.length} sin soporte completo`,
          a.sinLegalizar.length ? 'w' : 'o')}
  </div>

  <div class="card" style="margin-bottom:14px"><div class="card-b">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
      <span style="color:var(--text-2)">Consumo de la base</span>
      <strong>${Math.round(a.pctUsado * 100)}%</strong>
    </div>
    ${barra(a.pctUsado * 100, colorConsumo)}
    ${a.pctUsado >= CFG.topeAlertaCaja ? `
      <p style="font-size:12px;color:var(--warn);margin-top:8px">
        ⚠️ Superaste el ${Math.round(CFG.topeAlertaCaja * 100)}% de la base: tramita el reembolso.
      </p>` : ''}
  </div></div>`;
}

/* ---- Pestaña: movimientos ------------------------------------------------- */
function tabMovimientos(a, p, pid){
  const movs = a.movs
    .filter(FILTROS_CAJA[filtroCaja])
    .sort((x, y) => y.fecha < x.fecha ? -1 : 1);

  const filtros = [
    ['todos',        `Todos (${a.movs.length})`],
    ['sinlegalizar', `Sin legalizar (${a.sinLegalizar.length})`],
    ['sinsoporte',   `Sin soporte (${a.sinSoporte.length})`],
    ['porcobrar',    `Por cobrar (${a.gastos.filter(FILTROS_CAJA.porcobrar).length})`]
  ];

  return `
  <div class="card">
    <div class="card-h">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${filtros.map(([k, l]) =>
          `<button class="chip ${filtroCaja === k ? 'b' : 'n'}" onclick="setFiltroCaja('${k}')">${l}</button>`
        ).join('')}
      </div>
      <button class="btn sm" onclick="exportarCaja('${pid}')">⬇ Excel</button>
    </div>
    <div class="card-b flush scroll-x">
      <table>
        <thead><tr>
          <th>Fecha</th><th>Concepto</th><th>Beneficiario</th><th>Cuenta de pago</th>
          <th>Categoría</th><th>Cliente</th>
          <th class="num">Monto</th><th class="num">Reembolsado</th><th class="num">Pendiente</th>
          <th>Soportes</th><th>Legalizado</th><th>Observación</th><th></th>
        </tr></thead>
        <tbody>
        ${movs.length ? movs.map(g => filaCaja(g)).join('')
          : `<tr><td colspan="13">${vacio('📭', 'No hay movimientos con este filtro')}</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  ${desgloses(a)}`;
}

function filaCaja(g){
  const b = ben(g.beneficiario_id);
  const esIngreso = g.tipo === 'ingreso';
  const pend = esIngreso ? 0 : g.monto - (g.reembolsado || 0);

  const soportes = esIngreso ? '—' : `
    <span class="chip ${g.tiene_comprobante ? 'o' : 'd'}"
          title="${g.comprobante_pago ? 'Comprobante ' + esc(g.comprobante_pago) : 'Sin comprobante de pago'}">
      ${g.tiene_comprobante ? '📎' : '✕'} Pago</span>
    <span class="chip ${g.tiene_factura ? 'o' : 'd'}"
          title="${g.factura_num ? 'Factura ' + esc(g.factura_num) : 'Sin factura'}">
      ${g.tiene_factura ? '🧾' : '✕'} Fact.</span>`;

  return `
  <tr>
    <td style="white-space:nowrap;color:var(--text-2)">${fechaCorta(g.fecha)}</td>
    <td>${esc(g.concepto)}</td>
    <td>${b ? `<div style="font-weight:500">${esc(b.nombre)}</div>
               <div style="font-size:11px;color:var(--text-3)">${esc(b.tipo_doc)} ${esc(b.documento)}</div>`
            : '<span style="color:var(--text-3)">—</span>'}</td>
    <td>${b ? `<div style="font-size:11.5px">${esc(b.banco)}</div>
               <div style="font-size:11px;color:var(--text-3);font-family:var(--mono)">${esc(b.cuenta)}</div>`
            : `<span style="font-size:11.5px;color:var(--text-3)">${esc(g.metodo_pago || '—')}</span>`}</td>
    <td><span class="chip n">${esc(g.categoria)}</span></td>
    <td>${cliTag(g.cliente_id)}</td>
    <td class="num" style="font-weight:600;color:${esIngreso ? 'var(--ok)' : 'var(--text)'}">
      ${esIngreso ? '+' : '−'} ${cop(g.monto)}</td>
    <td class="num" style="color:${g.reembolsado ? 'var(--ok)' : 'var(--text-3)'}">
      ${esIngreso ? '—' : cop(g.reembolsado || 0)}</td>
    <td class="num" style="color:${pend > 0 ? 'var(--warn)' : 'var(--text-3)'};font-weight:${pend > 0 ? '600' : '400'}">
      ${esIngreso ? '—' : cop(pend)}</td>
    <td style="white-space:nowrap">${soportes}</td>
    <td>${esIngreso ? '<span class="chip n">Base</span>'
          : `<button class="chip ${g.legalizado ? 'o' : 'w'}" onclick="toggleLeg('${g.id}')"
                title="${g.legalizado_el ? 'Legalizado el ' + fechaCorta(g.legalizado_el) : 'Clic para legalizar'}">
               ${g.legalizado ? '✓ Sí' : 'Pendiente'}</button>`}</td>
    <td style="max-width:190px;font-size:11.5px;color:var(--text-2)">${esc(g.observacion || '')}</td>
    <td style="white-space:nowrap">
      <button class="btn sm" onclick="modalCaja('${g.tipo}','${g.id}')">✎</button>
      <button class="btn sm dgr" onclick="borrar('caja','${g.id}')">✕</button>
    </td>
  </tr>`;
}

/* ---- Desgloses por categoría, cliente y mensajero ------------------------- */
function desgloses(a){
  const agrupar = (clave) => {
    const m = {};
    a.gastos.forEach(g => { const k = clave(g); if(k) m[k] = (m[k] || 0) + g.monto; });
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  };

  const cats = agrupar(g => g.categoria);
  const bens = agrupar(g => g.beneficiario_id);
  const clis = agrupar(g => g.cliente_id);
  const maxCat = cats[0]?.[1] || 1;

  const bloque = (titulo, filas, etiqueta, color) => `
    <div class="card">
      <div class="card-h"><h2>${titulo}</h2></div>
      <div class="card-b" style="display:grid;gap:11px">
        ${filas.length ? filas.map(([k, v]) => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
              <span>${etiqueta(k)}</span><strong class="num">${cop(v)}</strong>
            </div>
            ${barra(v / maxCat * 100, color(k))}
          </div>`).join('') : vacio('📊', 'Sin datos')}
      </div>
    </div>`;

  return `
  <div class="grid g2" style="margin-top:14px">
    ${bloque('Gasto por categoría', cats, k => esc(k), () => 'var(--brand)')}
    ${bloque('Pagado por mensajero', bens,
        k => { const b = ben(k); return b ? esc(b.nombre) : 'Sin beneficiario'; },
        () => 'var(--purple)')}
    ${bloque('Gasto por cliente', clis, k => cliTag(k), k => cli(k).color)}
  </div>`;
}

/* ---- Pestaña: mensajeros y proveedores ------------------------------------ */
function tabBeneficiarios(){
  return `
  <div class="card">
    <div class="card-h">
      <h2>Mensajeros y proveedores</h2>
      <button class="btn pri sm" onclick="modalBeneficiario()">+ Nuevo</button>
    </div>
    <div class="card-b flush scroll-x">
      <table>
        <thead><tr>
          <th>Nombre</th><th>Documento</th><th>Banco</th><th>Cuenta</th>
          <th>Teléfono</th><th>Rol</th><th class="num">Pagado histórico</th><th></th>
        </tr></thead>
        <tbody>
        ${S.beneficiarios.length ? S.beneficiarios.map(b => {
          const total = suma(S.caja.filter(g => g.beneficiario_id === b.id), g => g.monto);
          return `
          <tr style="${b.activo === false ? 'opacity:.5' : ''}">
            <td style="font-weight:500">${esc(b.nombre)}</td>
            <td>${esc(b.tipo_doc)} ${esc(b.documento)}</td>
            <td>${esc(b.banco)}</td>
            <td><span style="font-family:var(--mono);font-size:12px">${esc(b.cuenta)}</span>
                <div style="font-size:11px;color:var(--text-3)">${esc(b.tipo_cuenta)}</div></td>
            <td>${esc(b.telefono || '—')}</td>
            <td><span class="chip ${b.rol === 'Mensajero' ? 'b' : 'n'}">${esc(b.rol || '—')}</span></td>
            <td class="num">${cop(total)}</td>
            <td style="white-space:nowrap">
              <button class="btn sm" onclick="modalBeneficiario('${b.id}')">✎</button>
              <button class="btn sm dgr" onclick="borrar('beneficiarios','${b.id}')">✕</button>
            </td>
          </tr>`;
        }).join('') : `<tr><td colspan="8">${vacio('👷', 'Aún no has registrado mensajeros')}</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ---- Pestaña: presupuesto ------------------------------------------------- */
function tabPresupuesto(pid){
  const lista = presupuestoVs(pid);
  return `
  <div class="card">
    <div class="card-h">
      <h2>Topes por categoría</h2>
      <button class="btn pri sm" onclick="modalPresupuesto()">+ Nuevo tope</button>
    </div>
    <div class="card-b" style="display:grid;gap:15px">
      ${lista.length ? lista.map(p => `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;
                      font-size:13px;margin-bottom:5px">
            <span style="font-weight:500">${esc(p.categoria)}
              ${p.excedido ? '<span class="chip d">Excedido</span>'
                : p.pct >= .8 ? '<span class="chip w">Cerca del tope</span>' : ''}</span>
            <span>
              <strong class="num">${cop(p.gastado)}</strong>
              <span style="color:var(--text-3)"> / ${cop(p.tope)}</span>
              <button class="btn sm" onclick="modalPresupuesto('${p.id}')">✎</button>
              <button class="btn sm dgr" onclick="borrar('presupuestos','${p.id}')">✕</button>
            </span>
          </div>
          ${barra(p.pct * 100, p.excedido ? 'var(--danger)' : p.pct >= .8 ? 'var(--warn)' : 'var(--ok)')}
        </div>`).join('') : vacio('🎯', 'Define topes para que la app te avise antes de pasarte')}
    </div>
  </div>`;
}

/* ---- Pestaña: períodos ---------------------------------------------------- */
function tabPeriodos(){
  return `
  <div class="card">
    <div class="card-h">
      <h2>Períodos de caja</h2>
      <button class="btn pri sm" onclick="modalPeriodo()">+ Abrir período</button>
    </div>
    <div class="card-b flush scroll-x">
      <table>
        <thead><tr>
          <th>Período</th><th>Desde</th><th>Hasta</th>
          <th class="num">Base</th><th class="num">Gastado</th><th class="num">Reembolsado</th>
          <th class="num">Pendiente</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody>
        ${S.periodos.map(p => {
          const a = arqueo(p.id);
          return `
          <tr>
            <td style="font-weight:500">${esc(p.nombre)}</td>
            <td>${fechaCorta(p.inicio)}</td>
            <td>${fechaCorta(p.fin)}</td>
            <td class="num">${cop(a.base)}</td>
            <td class="num">${cop(a.gastado)}</td>
            <td class="num" style="color:var(--ok)">${cop(a.reembolsado)}</td>
            <td class="num" style="color:${a.pendiente > 0 ? 'var(--warn)' : 'var(--text-3)'}">${cop(a.pendiente)}</td>
            <td><span class="chip ${p.estado === 'abierto' ? 'b' : 'n'}">
              ${p.estado === 'abierto' ? 'Abierto' : 'Cerrado ' + fechaCorta(p.cerrado_el)}</span></td>
            <td style="white-space:nowrap">
              <button class="btn sm" onclick="setPeriodoSel('${p.id}')">Ver</button>
              ${p.estado === 'abierto'
                ? `<button class="btn sm" onclick="cerrarPeriodo('${p.id}')">🔒 Cerrar</button>`
                : `<button class="btn sm" onclick="reabrirPeriodo('${p.id}')">🔓 Reabrir</button>`}
            </td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}
