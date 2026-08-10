/* ============================================================================
   ACCIONES DE CAJA MENOR
   Pagos a mensajeros y proveedores, legalización, reembolso y cierre de mes.
   ========================================================================== */

/* ---- Registrar / editar un movimiento ------------------------------------ */

const optsSelect = (arr, sel) => arr
  .map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');

const optsBen = sel => S.beneficiarios.filter(b => b.activo)
  .map(b => `<option value="${b.id}" ${sel === b.id ? 'selected' : ''}>
      ${esc(b.nombre)} — ${esc(b.tipo_doc)} ${esc(b.documento)}</option>`).join('');

/**
 * Formulario de movimiento.
 * @param tipo  'gasto' | 'ingreso'
 * @param id    si viene, edita en vez de crear
 */
function modalCaja(tipo, id = null){
  const g = id ? S.caja.find(x => x.id === id) : null;
  if(g) tipo = g.tipo;

  const esGasto = tipo === 'gasto';
  const pa = periodoActivo();

  const camposGasto = `
    <div><label>Beneficiario — mensajero o proveedor</label>
      <select id="gBen" onchange="pintarDatosBen()">
        <option value="">— Sin beneficiario (gasto propio) —</option>
        ${optsBen(g?.beneficiario_id)}
      </select>
      <div id="gBenInfo" style="font-size:11.5px;color:var(--text-2);margin-top:5px"></div>
    </div>

    <div class="f2">
      <div><label>Método de pago</label>
        <select id="gMet">${optsSelect(METODOS_PAGO, g?.metodo_pago || 'Transferencia')}</select></div>
      <div><label>N° comprobante de pago</label>
        <input id="gComp" placeholder="TRF-445120" value="${esc(g?.comprobante_pago || '')}"></div>
    </div>

    <div class="f2">
      <div><label>N° factura / cuenta de cobro</label>
        <input id="gFac" placeholder="FE-30514" value="${esc(g?.factura_num || '')}"></div>
      <div><label>Reembolsado (lo que ya te pagaron)</label>
        <input id="gReem" type="number" min="0" value="${g?.reembolsado || 0}"></div>
    </div>

    <div class="f-check">
      <label><input type="checkbox" id="gTC" ${g?.tiene_comprobante ? 'checked' : ''}> Tengo el comprobante de pago 📎</label>
      <label><input type="checkbox" id="gTF" ${g?.tiene_factura ? 'checked' : ''}> Tengo la factura 🧾</label>
    </div>
    <div class="f-check">
      <label><input type="checkbox" id="gLeg" ${g?.legalizado ? 'checked' : ''}> Ya legalizado ante contabilidad</label>
    </div>

    <div><label>Observación</label>
      <textarea id="gObs" placeholder="Ej. Falta que entregue la cuenta de cobro">${esc(g?.observacion || '')}</textarea></div>`;

  openModal(formModal(
    id ? 'Editar movimiento' : (esGasto ? 'Registrar pago o gasto' : 'Registrar ingreso a la caja'),
    `
    <div class="f2">
      <div><label>Concepto</label>
        <input id="gC" placeholder="Ej. Pago recorrido semana 2" value="${esc(g?.concepto || '')}"></div>
      <div><label>Fecha</label>
        <input type="date" id="gF" value="${g?.fecha || hoyISO()}"></div>
    </div>

    <div class="f2">
      <div><label>Monto (COP)</label>
        <input id="gM" type="number" placeholder="180000" value="${g?.monto || ''}"></div>
      <div><label>Categoría</label>
        <select id="gK">${optsSelect(CATEGORIAS_CAJA, g?.categoria || (esGasto ? 'Pago mensajero' : 'Base'))}</select></div>
    </div>

    <div class="f2">
      <div><label>Cliente / centro de costo</label>
        <select id="gCl">${optsCli(g?.cliente_id || 'c5')}</select></div>
      <div><label>Período</label>
        <select id="gPer">${S.periodos.map(p =>
          `<option value="${p.id}" ${(g?.periodo_id || pa?.id) === p.id ? 'selected' : ''}>
             ${esc(p.nombre)}${p.estado === 'cerrado' ? ' (cerrado)' : ''}</option>`).join('')}</select></div>
    </div>

    ${esGasto ? camposGasto : `
    <div class="f2">
      <div><label>Método</label>
        <select id="gMet">${optsSelect(METODOS_PAGO, g?.metodo_pago || 'Transferencia')}</select></div>
      <div><label>N° comprobante</label>
        <input id="gComp" placeholder="TRF-889012" value="${esc(g?.comprobante_pago || '')}"></div>
    </div>
    <div><label>Observación</label>
      <textarea id="gObs">${esc(g?.observacion || '')}</textarea></div>`}
    `,
    `guardarCaja('${tipo}', ${id ? `'${id}'` : 'null'})`,
    id ? 'Guardar cambios' : 'Registrar'));

  pintarDatosBen();
}

/** Muestra banco y cuenta del beneficiario elegido, para verificar antes de pagar. */
function pintarDatosBen(){
  const sel = $('#gBen');
  const info = $('#gBenInfo');
  if(!sel || !info) return;
  const b = ben(sel.value);
  info.innerHTML = b
    ? `🏦 ${esc(b.banco)} · ${esc(b.tipo_cuenta)} <strong>${esc(b.cuenta)}</strong>
       &nbsp;·&nbsp; ${esc(b.tipo_doc)} ${esc(b.documento)}`
    : '';
}

async function guardarCaja(tipo, id = null){
  const monto = +$('#gM').value;
  if(!monto){ toast('Escribe el monto'); return; }

  const esGasto = tipo === 'gasto';
  const legalizado = esGasto ? $('#gLeg').checked : true;

  const fila = {
    tipo, monto,
    concepto:   $('#gC').value.trim() || 'Sin concepto',
    fecha:      $('#gF').value,
    categoria:  $('#gK').value,
    cliente_id: $('#gCl').value,
    periodo_id: $('#gPer').value,
    metodo_pago:      $('#gMet')?.value  || 'Transferencia',
    comprobante_pago: $('#gComp')?.value.trim() || '',
    observacion:      $('#gObs')?.value.trim()  || '',
    beneficiario_id:  esGasto ? ($('#gBen').value || null) : null,
    factura_num:      esGasto ? $('#gFac').value.trim() : '',
    tiene_comprobante: esGasto ? $('#gTC').checked : true,
    tiene_factura:     esGasto ? $('#gTF').checked : true,
    reembolsado:       esGasto ? (+$('#gReem').value || 0) : 0,
    legalizado,
    legalizado_el: legalizado ? (id ? (S.caja.find(x => x.id === id)?.legalizado_el || hoyISO()) : hoyISO()) : null
  };

  if(fila.reembolsado > fila.monto){
    toast('El reembolso no puede superar el monto'); return;
  }

  if(id) await db.update('caja', id, fila);
  else    await db.insert('caja', fila);

  closeModal(); render();
  toast(id ? 'Movimiento actualizado ✓' : 'Movimiento registrado ✓');
}

/* ---- Legalización -------------------------------------------------------- */
async function toggleLeg(id){
  const g = S.caja.find(x => x.id === id);
  const ahora = !g.legalizado;

  if(ahora && (!g.tiene_comprobante || !g.tiene_factura)){
    const falta = [!g.tiene_comprobante && 'comprobante de pago', !g.tiene_factura && 'factura']
      .filter(Boolean).join(' y ');
    if(!confirm(`A este movimiento le falta ${falta}. ¿Legalizarlo de todos modos?`)) return;
  }

  await db.update('caja', id, { legalizado: ahora, legalizado_el: ahora ? hoyISO() : null });
  render();
}

/* ---- Reembolso ----------------------------------------------------------- */

/**
 * Reparte un reembolso recibido entre los gastos legalizados más antiguos
 * que aún tengan saldo por cobrar. Así no toca ir uno por uno.
 */
function modalReembolso(periodoId){
  const a = arqueo(periodoId);
  openModal(formModal('Registrar reembolso recibido', `
    <div class="alert o" style="margin-bottom:2px">
      <span>💰</span>
      <div class="a-txt">
        <b>Por cobrar: ${cop(a.cobrable)}</b>
        <small>Es lo legalizado que aún no te devuelven.
        ${a.trabado > 0 ? `Otros ${cop(a.trabado)} están trabados por falta de legalización.` : ''}</small>
      </div>
    </div>
    <div class="f2">
      <div><label>Monto recibido</label>
        <input id="rM" type="number" value="${Math.round(a.cobrable)}"></div>
      <div><label>Fecha</label><input type="date" id="rF" value="${hoyISO()}"></div>
    </div>
    <div><label>Observación</label>
      <input id="rO" placeholder="Ej. Transferencia de nómina del 15"></div>
    <p style="font-size:11.5px;color:var(--text-2)">
      Se aplicará a los gastos legalizados más antiguos que sigan pendientes.</p>`,
    `aplicarReembolso('${periodoId}')`, 'Aplicar'));
}

async function aplicarReembolso(periodoId){
  let restante = +$('#rM').value;
  if(!restante){ toast('Escribe el monto recibido'); return; }

  const obs = $('#rO').value.trim();
  const pendientes = S.caja
    .filter(g => g.periodo_id === periodoId && g.tipo === 'gasto'
              && g.legalizado && (g.monto - (g.reembolsado || 0)) > 0)
    .sort((a, b) => a.fecha < b.fecha ? -1 : 1);

  let cubiertos = 0;
  for(const g of pendientes){
    if(restante <= 0) break;
    const falta = g.monto - (g.reembolsado || 0);
    const aplica = Math.min(falta, restante);
    await db.update('caja', g.id, {
      reembolsado: (g.reembolsado || 0) + aplica,
      observacion: obs ? [g.observacion, obs].filter(Boolean).join(' · ') : g.observacion
    });
    restante -= aplica;
    cubiertos++;
  }

  const p = per(periodoId);
  if(p) await db.update('periodos', periodoId,
    { reembolso_recibido: (p.reembolso_recibido || 0) + (+$('#rM').value - restante) });

  closeModal(); render();
  toast(restante > 0
    ? `Aplicado a ${cubiertos} gastos · sobran ${cop(restante)} sin asignar`
    : `Reembolso aplicado a ${cubiertos} gastos ✓`);
}

/* ---- Períodos ------------------------------------------------------------ */
function modalPeriodo(){
  // El primer período es el mes actual; los siguientes, el mes que viene.
  const hoy = new Date();
  const salto = S.periodos.length ? 1 : 0;
  const ini = new Date(hoy.getFullYear(), hoy.getMonth() + salto, 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + salto + 1, 0);
  const primero = !S.periodos.length;

  openModal(formModal(primero ? 'Abrir tu primer período' : 'Abrir nuevo período', `
    <div><label>Nombre</label><input id="peN" value="${nombreMes(ini)}"></div>
    <div class="f2">
      <div><label>Inicio</label><input type="date" id="peI" value="${dISO(ini)}"></div>
      <div><label>Fin</label><input type="date" id="peF" value="${dISO(fin)}"></div>
    </div>
    <div><label>Base asignada (COP)</label>
      <input id="peB" type="number" placeholder="1500000" value=""></div>
    <p style="font-size:11.5px;color:var(--text-2)">
      ${primero
        ? 'La base entra como primer movimiento del período. Déjala en blanco si aún no te la asignan.'
        : 'Al abrir un período, el anterior se cierra y los movimientos nuevos caen aquí.'}</p>`,
    'guardarPeriodo()', 'Abrir período'));
}

async function guardarPeriodo(){
  const nombre = $('#peN').value.trim();
  if(!nombre){ toast('Ponle nombre al período'); return; }

  // Cierra el período abierto actual
  const abierto = periodoActivo();
  if(abierto && abierto.estado === 'abierto')
    await db.update('periodos', abierto.id, { estado:'cerrado', cerrado_el: hoyISO() });

  const p = await db.insert('periodos', {
    nombre, inicio:$('#peI').value, fin:$('#peF').value,
    base_asignada: +$('#peB').value || 0,
    estado:'abierto', cerrado_el:null, reembolso_recibido:0
  });

  // La base entra como ingreso del período nuevo
  if(p.base_asignada > 0)
    await db.insert('caja', {
      tipo:'ingreso', monto:p.base_asignada, concepto:'Base asignada del período',
      categoria:'Base', cliente_id:S.clientes[0]?.id || null, periodo_id:p.id, fecha:p.inicio,
      metodo_pago:'Transferencia', comprobante_pago:'', observacion:'',
      beneficiario_id:null, factura_num:'',
      tiene_comprobante:true, tiene_factura:true,
      legalizado:true, legalizado_el:p.inicio, reembolsado:0
    });

  periodoSel = p.id;
  closeModal(); render(); toast('Período abierto ✓');
}

async function cerrarPeriodo(id){
  const a = arqueo(id);
  const avisos = [];
  if(a.sinLegalizar.length) avisos.push(`${a.sinLegalizar.length} movimientos sin legalizar (${cop(a.montoSinLeg)})`);
  if(a.pendiente > 0)       avisos.push(`${cop(a.pendiente)} sin reembolsar`);

  const msg = avisos.length
    ? `Ojo, al cerrar quedan:\n\n· ${avisos.join('\n· ')}\n\n¿Cerrar de todos modos?`
    : '¿Cerrar este período? Ya no deberías registrar movimientos en él.';
  if(!confirm(msg)) return;

  await db.update('periodos', id, { estado:'cerrado', cerrado_el: hoyISO() });
  render(); toast('Período cerrado');
}

async function reabrirPeriodo(id){
  await db.update('periodos', id, { estado:'abierto', cerrado_el:null });
  render(); toast('Período reabierto');
}

/* ---- Beneficiarios (mensajeros y proveedores) ---------------------------- */
function modalBeneficiario(id = null){
  const b = id ? ben(id) : null;
  openModal(formModal(id ? 'Editar beneficiario' : 'Nuevo mensajero o proveedor', `
    <div><label>Nombre completo / razón social</label>
      <input id="bN" placeholder="Ej. Jhon Alexander Ruiz" value="${esc(b?.nombre || '')}"></div>

    <div class="f2">
      <div><label>Tipo de documento</label>
        <select id="bTD">${optsSelect(TIPOS_DOC, b?.tipo_doc || 'CC')}</select></div>
      <div><label>Número</label>
        <input id="bD" placeholder="1013456789" value="${esc(b?.documento || '')}"></div>
    </div>

    <div class="f2">
      <div><label>Banco</label>
        <select id="bB">${optsSelect(BANCOS, b?.banco || 'Bancolombia')}</select></div>
      <div><label>Tipo de cuenta</label>
        <select id="bTC">${optsSelect(TIPOS_CUENTA, b?.tipo_cuenta || 'Ahorros')}</select></div>
    </div>

    <div class="f2">
      <div><label>N° de cuenta</label>
        <input id="bC" placeholder="91234567890" value="${esc(b?.cuenta || '')}"></div>
      <div><label>Teléfono</label>
        <input id="bT" placeholder="3105558877" value="${esc(b?.telefono || '')}"></div>
    </div>

    <div class="f2">
      <div><label>Rol</label>
        <select id="bR">${optsSelect(['Mensajero','Proveedor','Contratista','Otro'], b?.rol || 'Mensajero')}</select></div>
      <div><label>Estado</label>
        <select id="bA">
          <option value="1" ${b?.activo !== false ? 'selected' : ''}>Activo</option>
          <option value="0" ${b?.activo === false ? 'selected' : ''}>Inactivo</option>
        </select></div>
    </div>`,
    `guardarBeneficiario(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear'));
}

async function guardarBeneficiario(id = null){
  const nombre = $('#bN').value.trim();
  if(!nombre){ toast('Escribe el nombre'); return; }

  const fila = {
    nombre,
    tipo_doc:   $('#bTD').value,
    documento:  $('#bD').value.trim(),
    banco:      $('#bB').value,
    tipo_cuenta:$('#bTC').value,
    cuenta:     $('#bC').value.trim(),
    telefono:   $('#bT').value.trim(),
    rol:        $('#bR').value,
    activo:     $('#bA').value === '1'
  };

  if(id) await db.update('beneficiarios', id, fila);
  else    await db.insert('beneficiarios', fila);

  closeModal(); render(); toast(id ? 'Datos actualizados ✓' : 'Beneficiario creado ✓');
}

/* ---- Exportar el arqueo -------------------------------------------------- */
/** Baja el período en CSV, listo para adjuntar a la legalización. */
function exportarCaja(periodoId){
  const p = per(periodoId);
  const a = arqueo(periodoId);

  const cols = ['Fecha','Tipo','Concepto','Categoria','Cliente','Beneficiario','Documento',
                'Banco','Tipo cuenta','Cuenta','Metodo pago','Comprobante','Factura',
                'Monto','Reembolsado','Pendiente','Legalizado','Fecha legalizacion','Observacion'];

  const campo = v => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[";\n]/.test(s) ? `"${s}"` : s;
  };

  const filas = a.movs
    .sort((x, y) => x.fecha < y.fecha ? -1 : 1)
    .map(g => {
      const b = ben(g.beneficiario_id);
      return [
        g.fecha, g.tipo, g.concepto, g.categoria, cli(g.cliente_id).nombre,
        b?.nombre || '', b ? `${b.tipo_doc} ${b.documento}` : '',
        b?.banco || '', b?.tipo_cuenta || '', b?.cuenta || '',
        g.metodo_pago || '', g.comprobante_pago || '', g.factura_num || '',
        g.monto, g.reembolsado || 0,
        g.tipo === 'gasto' ? g.monto - (g.reembolsado || 0) : 0,
        g.legalizado ? 'SI' : 'NO', g.legalizado_el || '', g.observacion || ''
      ].map(campo).join(';');
    });

  const totales = ['', '', 'TOTALES', '', '', '', '', '', '', '', '', '', '',
                   a.gastado, a.reembolsado, a.pendiente, '', '', ''].map(campo).join(';');

  // BOM para que Excel en español abra las tildes bien
  const csv = '﻿' + [cols.join(';'), ...filas, totales].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
  const a2  = Object.assign(document.createElement('a'), {
    href: url,
    download: `caja-menor-${(p?.nombre || 'periodo').toLowerCase().replace(/\s+/g, '-')}.csv`
  });
  document.body.appendChild(a2); a2.click(); a2.remove();
  URL.revokeObjectURL(url);
  toast('Arqueo exportado ✓');
}

/* ---- Presupuestos -------------------------------------------------------- */
function modalPresupuesto(id = null){
  const p = id ? S.presupuestos.find(x => x.id === id) : null;
  openModal(formModal(id ? 'Editar tope' : 'Nuevo tope de gasto', `
    <div><label>Categoría</label>
      <select id="tK">${optsSelect(CATEGORIAS_CAJA, p?.categoria || 'Pago mensajero')}</select></div>
    <div><label>Tope por período (COP)</label>
      <input id="tT" type="number" value="${p?.tope || 500000}"></div>
    <p style="font-size:11.5px;color:var(--text-2)">
      La app te avisa cuando el gasto de la categoría se acerque a este tope.</p>`,
    `guardarPresupuesto(${id ? `'${id}'` : 'null'})`, 'Guardar'));
}

async function guardarPresupuesto(id = null){
  const fila = { categoria: $('#tK').value, tope: +$('#tT').value || 0 };
  if(id) await db.update('presupuestos', id, fila);
  else{
    if(S.presupuestos.some(p => p.categoria === fila.categoria)){
      toast('Ya existe un tope para esa categoría'); return;
    }
    await db.insert('presupuestos', fila);
  }
  closeModal(); render(); toast('Tope guardado ✓');
}
