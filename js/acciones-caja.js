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
  const estado = g?.estado || 'pendiente_consignacion';

  const camposGasto = `
    <div><label>Beneficiario — mensajero o proveedor</label>
      <select id="gBen" onchange="pintarDatosBen()">
        <option value="">— Sin beneficiario (gasto propio) —</option>
        ${optsBen(g?.beneficiario_id)}
      </select>
      <div id="gBenInfo" style="font-size:11.5px;color:var(--text-2);margin-top:5px"></div>
    </div>

    <div><label>Método de pago</label>
      <select id="gMet">${optsSelect(lista('metodo_pago'), g?.metodo_pago || 'Transferencia')}</select></div>

    <!-- Adjuntos: la foto se toma con la cámara y se comprime sola -->
    ${campoArchivo('gComprob', '📎 Comprobante de pago (si aplica)', g?.comprobante_url)}
    <div><label>N° del comprobante</label>
      <input id="gComp" placeholder="TRF-445120" value="${esc(g?.comprobante_pago || '')}"></div>

    ${campoArchivo('gFactura', '🧾 Factura o cuenta de cobro (si aplica)', g?.factura_url)}
    <div><label>N° de la factura</label>
      <input id="gFac" placeholder="FE-30514" value="${esc(g?.factura_num || '')}"></div>

    <div><label>Estado del pago</label>
      <select id="gEst">
        ${Object.entries(ESTADOS_PAGO).map(([k, v]) =>
          `<option value="${k}" ${estado === k ? 'selected' : ''}>${v.ico} ${v.l}</option>`).join('')}
      </select>
      <div style="font-size:11.5px;color:var(--text-2);margin-top:5px" id="gEstAyuda"></div>
    </div>

    <div><label>Observación</label>
      <textarea id="gObs" placeholder="Ej. Falta que entregue la cuenta de cobro">${esc(g?.observacion || '')}</textarea></div>

    <!-- Cierre del pago: se llena después, cuando ya legalizaste y te devolvieron -->
    <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:2px">
      <div style="font-size:11.5px;font-weight:700;color:var(--text-3);
                  text-transform:uppercase;letter-spacing:.6px;margin-bottom:11px">
        Cierre del pago</div>

      <div class="f-check" style="margin-bottom:12px">
        <label><input type="checkbox" id="gLeg" ${g?.legalizado ? 'checked' : ''}>
          Ya la pasé a la automatización</label>
      </div>

      <div class="f-check" style="margin-bottom:11px">
        <label><input type="checkbox" id="gReemTodo"
          ${g && g.reembolsado >= g.monto && g.monto > 0 ? 'checked' : ''}
          onchange="sincronizarReembolso()"> Ya me reembolsaron todo</label>
      </div>

      <label>Reembolsado (si fue parcial, escribe cuánto)</label>
      <input id="gReem" type="number" min="0" value="${g?.reembolsado || 0}"
             oninput="document.getElementById('gReemTodo').checked = false">
    </div>`;

  openModal(formModal(
    id ? 'Editar pago' : (esGasto ? 'Registrar pago' : 'Registrar ingreso a la caja'),
    `
    <div><label>Categoría</label>
      <select id="gK">${optsSelect(lista('categoria_caja'),
        g?.categoria || (esGasto ? 'Pago mensajero' : 'Base'))}</select></div>

    <div class="f2">
      <div><label>Fecha</label>
        <input type="date" id="gF" value="${g?.fecha || hoyISO()}"></div>
      <div><label>Monto (COP)</label>
        <input id="gM" type="number" inputmode="numeric" placeholder="180000" value="${g?.monto || ''}"></div>
    </div>

    <div><label>Concepto</label>
      <input id="gC" placeholder="Ej. Pago recorrido semana 2" value="${esc(g?.concepto || '')}"></div>

    <div class="f2">
      <div><label>Cliente / centro de costo</label>
        <select id="gCl">${optsCli(g?.cliente_id)}</select></div>
      <div><label>Período</label>
        <select id="gPer">${S.periodos.map(p =>
          `<option value="${p.id}" ${(g?.periodo_id || pa?.id) === p.id ? 'selected' : ''}>
             ${esc(p.nombre)}${p.estado === 'cerrado' ? ' (cerrado)' : ''}</option>`).join('')}</select></div>
    </div>

    ${esGasto ? camposGasto : `
    <div><label>Método</label>
      <select id="gMet">${optsSelect(lista('metodo_pago'), g?.metodo_pago || 'Transferencia')}</select></div>
    ${campoArchivo('gComprob', '📎 Comprobante de la consignación', g?.comprobante_url)}
    <div><label>N° del comprobante</label>
      <input id="gComp" placeholder="TRF-889012" value="${esc(g?.comprobante_pago || '')}"></div>
    <div><label>Observación</label>
      <textarea id="gObs">${esc(g?.observacion || '')}</textarea></div>`}
    `,
    `guardarCaja('${tipo}', ${id ? `'${id}'` : 'null'})`,
    id ? 'Guardar cambios' : 'Registrar'));

  pintarDatosBen();
  pintarAyudaEstado();
  $('#gEst')?.addEventListener('change', pintarAyudaEstado);
}

function pintarAyudaEstado(){
  const sel = $('#gEst'), caja = $('#gEstAyuda');
  if(sel && caja) caja.textContent = ESTADOS_PAGO[sel.value]?.ayuda || '';
}

/** "Ya me reembolsaron todo" llena el campo con el monto completo. */
function sincronizarReembolso(){
  const todo = $('#gReemTodo').checked;
  $('#gReem').value = todo ? (+$('#gM').value || 0) : 0;
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
  const comprobante_url = refArchivo('gComprob');
  const factura_url     = esGasto ? refArchivo('gFactura') : '';

  const fila = {
    tipo, monto,
    concepto:   $('#gC').value.trim() || 'Sin concepto',
    fecha:      $('#gF').value,
    categoria:  $('#gK').value,
    cliente_id: $('#gCl').value || null,
    periodo_id: $('#gPer').value,
    metodo_pago:      $('#gMet')?.value  || 'Transferencia',
    comprobante_pago: $('#gComp')?.value.trim() || '',
    observacion:      $('#gObs')?.value.trim()  || '',
    beneficiario_id:  esGasto ? ($('#gBen').value || null) : null,
    factura_num:      esGasto ? $('#gFac').value.trim() : '',
    comprobante_url, factura_url,
    // El soporte se da por tenido si hay foto adjunta o número registrado
    tiene_comprobante: !!comprobante_url || !!($('#gComp')?.value.trim()),
    tiene_factura:     esGasto ? (!!factura_url || !!$('#gFac').value.trim()) : true,
    estado:            esGasto ? $('#gEst').value : 'finalizado',
    reembolsado:       esGasto ? (+$('#gReem').value || 0) : 0,
    // La pérdida se marca desde su propio diálogo, no aquí: al editar se conserva
    perdida:        id ? (S.caja.find(x => x.id === id)?.perdida || false) : false,
    motivo_perdida: id ? (S.caja.find(x => x.id === id)?.motivo_perdida || '') : '',
    legalizado,
    legalizado_el: legalizado ? (id ? (S.caja.find(x => x.id === id)?.legalizado_el || hoyISO()) : hoyISO()) : null
  };

  if(fila.reembolsado > fila.monto){
    toast('El reembolso no puede superar el monto'); return;
  }

  if(id) await db.update('caja', id, fila);
  else    await db.insert('caja', fila);

  closeModal(); render();
  toast(id ? 'Pago actualizado ✓' : 'Pago registrado ✓');
}

/* ---- Ficha del pago: todo lo que se necesita para legalizar --------------- */
function verPago(id){
  const g = S.caja.find(x => x.id === id);
  if(!g) return;

  const b    = ben(g.beneficiario_id);
  const est  = ESTADOS_PAGO[g.estado] || ESTADOS_PAGO.pendiente_consignacion;
  const pend = g.monto - (g.reembolsado || 0);
  const esIngreso = g.tipo === 'ingreso';

  const dato = (etiqueta, valor, mono) => valor ? `
    <div class="ficha-fila">
      <span>${esc(etiqueta)}</span>
      <strong ${mono ? 'style="font-family:var(--mono);font-size:12.5px"' : ''}>${valor}</strong>
    </div>` : '';

  const adjunto = (ref, titulo, numero) => `
    <div class="ficha-adj">
      <div class="ficha-adj-txt">
        <strong>${esc(titulo)}</strong>
        <small>${ref ? (esPDF(ref) ? 'PDF adjunto' : 'Foto adjunta') : 'Sin adjuntar'}
          ${numero ? ` · N° ${esc(numero)}` : ''}</small>
      </div>
      ${ref
        ? `<button class="btn sm pri" onclick="verArchivo(${JSON.stringify(ref).replace(/"/g,'&quot;')},
             '${esc(titulo)}','${esc(g.concepto)}-${esc(titulo)}')">Ver y descargar</button>`
        : `<span class="chip d">Falta</span>`}
    </div>`;

  openModal(`
    <div class="modal-h">
      <h3>${esc(g.concepto)}</h3>
      <button class="btn sm" onclick="closeModal()">✕</button>
    </div>

    <div class="modal-b" style="gap:0">
      <div class="ficha-monto">
        <div class="ficha-monto-val" style="color:${esIngreso ? 'var(--ok)' : 'var(--text)'}">
          ${esIngreso ? '+' : '−'}${cop(g.monto)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:9px">
          ${g.perdida
            ? `<span class="chip d">📉 Pérdida de ${cop(pend)}</span>`
            : `<span class="chip ${est.c}">${est.ico} ${est.l}</span>`}
          <span class="chip ${g.legalizado ? 'o' : 'n'}">
            ${g.legalizado ? '✓ Legalizado' : '○ Sin pasar a automatización'}</span>
          ${!esIngreso && !g.perdida ? `<span class="chip ${pend > 0 ? 'w' : 'o'}">
            ${pend > 0 ? `Falta cobrar ${cop(pend)}` : '✓ Reembolsado'}</span>` : ''}
        </div>
        ${g.perdida && g.motivo_perdida
          ? `<p style="font-size:12px;color:var(--danger);margin-top:9px">${esc(g.motivo_perdida)}</p>` : ''}
      </div>

      <div class="ficha">
        ${dato('Fecha', fechaCorta(g.fecha))}
        ${dato('Categoría', esc(g.categoria))}
        ${dato('Cliente', g.cliente_id ? cliTag(g.cliente_id) : '')}
        ${dato('Método de pago', esc(g.metodo_pago))}
      </div>

      ${b ? `
      <div class="ficha-tit">Beneficiario</div>
      <div class="ficha">
        ${dato('Nombre', esc(b.nombre))}
        ${dato('Documento', `${esc(b.tipo_doc)} ${esc(b.documento)}`, true)}
        ${dato('Banco', esc(b.banco))}
        ${dato('Cuenta', `${esc(b.cuenta)} · ${esc(b.tipo_cuenta)}`, true)}
        ${dato('Teléfono', esc(b.telefono))}
      </div>` : ''}

      <div class="ficha-tit">Soportes</div>
      ${adjunto(g.comprobante_url, 'Comprobante de pago', g.comprobante_pago)}
      ${!esIngreso ? adjunto(g.factura_url, 'Factura / cuenta de cobro', g.factura_num) : ''}

      ${!esIngreso ? `
      <div class="ficha-tit">Dinero</div>
      <div class="ficha">
        ${dato('Pagado', cop(g.monto), true)}
        ${dato('Reembolsado', cop(g.reembolsado || 0), true)}
        <div class="ficha-fila">
          <span>Pendiente</span>
          <strong style="font-family:var(--mono);font-size:12.5px;
                  color:${pend > 0 ? 'var(--warn)' : 'var(--ok)'}">${cop(pend)}</strong>
        </div>
        ${dato('Legalizado el', g.legalizado_el ? fechaCorta(g.legalizado_el) : '')}
      </div>` : ''}

      ${g.observacion ? `
      <div class="ficha-tit">Observación</div>
      <p style="font-size:13.5px;color:var(--text-2);padding:0 2px">${esc(g.observacion)}</p>` : ''}
    </div>

    <div class="modal-f">
      <button class="btn dgr" onclick="closeModal();borrar('caja','${g.id}')">Eliminar</button>
      ${esIngreso ? '' : `
        <button class="btn" onclick="closeModal();modalPerdida('${g.id}')">
          ${g.perdida ? '↺ Ya no es pérdida' : '📉 Marcar pérdida'}</button>`}
      <button class="btn pri" onclick="closeModal();modalCaja('${g.tipo}','${g.id}')">✎ Editar</button>
    </div>`);
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
/**
 * Reembolso por selección: marcas cuáles gastos te devolvieron y cada uno
 * queda saldado por completo. Es lo que pasa de verdad — te consignan por
 * un lote de gastos concretos, no un monto suelto que haya que repartir.
 */
function modalReembolso(periodoId){
  const a = arqueo(periodoId);

  if(!a.porCobrar.length){
    openModal(formModal('Registrar reembolso', `
      <div class="alert ${a.trabado > 0 ? 'w' : 'o'}">
        <span>${a.trabado > 0 ? '🔒' : '✅'}</span>
        <div class="a-txt">
          <b>${a.trabado > 0 ? 'No hay nada cobrable todavía' : 'Todo al día'}</b>
          <small>${a.trabado > 0
            ? `Tienes ${cop(a.trabado)} en gastos sin legalizar. Legalízalos primero y aparecerán aquí.`
            : 'No hay gastos pendientes de reembolso en este período.'}</small>
        </div>
      </div>`, 'closeModal()', 'Entendido'));
    return;
  }

  const filas = a.porCobrar
    .sort((x, y) => x.fecha < y.fecha ? -1 : 1)
    .map(g => {
      const falta = g.monto - (g.reembolsado || 0);
      const b = ben(g.beneficiario_id);
      return `
      <label class="reem-fila">
        <input type="checkbox" value="${g.id}" data-monto="${falta}"
               onchange="sumarSeleccion()">
        <span class="reem-txt">
          <strong>${esc(g.concepto)}</strong>
          <small>${fechaCorta(g.fecha)} · ${esc(g.categoria)}${b ? ' · ' + esc(b.nombre) : ''}</small>
        </span>
        <span class="reem-monto">${cop(falta)}</span>
      </label>`;
    }).join('');

  openModal(formModal('Registrar reembolso recibido', `
    <p style="font-size:13px;color:var(--text-2)">
      Marca los gastos que te devolvieron. Cada uno marcado queda saldado
      y pasa a "reembolsado".
    </p>

    <div class="reem-acciones">
      <button type="button" class="btn sm" onclick="marcarTodosReembolso(true)">Marcar todos</button>
      <button type="button" class="btn sm" onclick="marcarTodosReembolso(false)">Ninguno</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-3)">
        ${a.porCobrar.length} por cobrar · ${cop(a.cobrable)}</span>
    </div>

    <div class="reem-lista" id="reemLista">${filas}</div>

    <div class="reem-total">
      <span>Seleccionado</span>
      <strong id="reemTotal">$ 0</strong>
    </div>

    <div class="f2">
      <div><label>Fecha del reembolso</label>
        <input type="date" id="rF" value="${hoyISO()}"></div>
      <div><label>Observación</label>
        <input id="rO" placeholder="Ej. Transferencia del 15"></div>
    </div>`,
    `aplicarReembolso('${periodoId}')`, 'Marcar como reembolsados'));

  sumarSeleccion();
}

/** Total en vivo de lo marcado, para cuadrar contra lo que llegó al banco. */
function sumarSeleccion(){
  const marcadas = [...document.querySelectorAll('#reemLista input:checked')];
  const total = marcadas.reduce((a, c) => a + (+c.dataset.monto || 0), 0);
  const el = $('#reemTotal');
  if(el){
    el.textContent = cop(total);
    el.style.color = total ? 'var(--ok)' : 'var(--text-3)';
  }
}

function marcarTodosReembolso(valor){
  document.querySelectorAll('#reemLista input').forEach(c => c.checked = valor);
  sumarSeleccion();
}

async function aplicarReembolso(periodoId){
  const marcadas = [...document.querySelectorAll('#reemLista input:checked')];
  if(!marcadas.length){ toast('Marca al menos un gasto'); return; }

  const obs   = $('#rO').value.trim();
  const fecha = $('#rF').value;
  let total = 0;

  for(const c of marcadas){
    const g = S.caja.find(x => x.id === c.value);
    if(!g) continue;
    total += g.monto - (g.reembolsado || 0);
    await db.update('caja', g.id, {
      reembolsado: g.monto,                    // marcado = saldado por completo
      estado: 'finalizado',
      observacion: obs
        ? [g.observacion, `Reembolsado ${fechaCorta(fecha)}: ${obs}`].filter(Boolean).join(' · ')
        : g.observacion
    });
  }

  const p = per(periodoId);
  if(p) await db.update('periodos', periodoId,
    { reembolso_recibido: (p.reembolso_recibido || 0) + total });

  closeModal(); render();
  toast(`${marcadas.length} gasto${marcadas.length > 1 ? 's' : ''} reembolsado${marcadas.length > 1 ? 's' : ''} · ${cop(total)} ✓`);
}

/* ---- Pérdidas ------------------------------------------------------------
   Un gasto que ya sabes que no te van a devolver. Dejarlo como "pendiente"
   solo infla lo que crees que te deben; marcándolo sabes cuánto perdiste.
   -------------------------------------------------------------------------- */
const MOTIVOS_PERDIDA = [
  'Sin soporte — se perdió el recibo',
  'Rechazado por contabilidad',
  'Fuera de plazo para legalizar',
  'Faltante de caja',
  'Gasto no autorizado',
  'Otro'
];

function modalPerdida(id){
  const g = S.caja.find(x => x.id === id);
  const falta = g.monto - (g.reembolsado || 0);

  if(g.perdida){
    confirmarPeligro('¿Recuperar este gasto?',
      `"${g.concepto}" está marcado como pérdida de ${cop(falta)}.\n\n` +
      `Al recuperarlo vuelve a contar como pendiente por cobrar.`,
      async () => {
        await db.update('caja', id, { perdida:false, motivo_perdida:'' });
        render(); toast('Vuelve a contar como cobrable');
      }, 'Recuperar');
    return;
  }

  openModal(formModal('Registrar pérdida', `
    <div class="alert w">
      <span>📉</span>
      <div class="a-txt">
        <b>${esc(g.concepto)} · ${cop(falta)}</b>
        <small>Este monto dejará de contar como "por cobrar" y pasará a pérdidas.
          Podrás revertirlo si al final sí te lo devuelven.</small>
      </div>
    </div>
    <div><label>¿Por qué se perdió?</label>
      <select id="pMotivo">${MOTIVOS_PERDIDA.map(m => `<option>${esc(m)}</option>`).join('')}</select></div>
    <div><label>Detalle (opcional)</label>
      <input id="pDet" placeholder="Ej. El parqueadero no emitió factura"></div>`,
    `guardarPerdida('${id}')`, 'Marcar como pérdida'));
}

async function guardarPerdida(id){
  const motivo = $('#pMotivo').value;
  const det    = $('#pDet').value.trim();
  await db.update('caja', id, {
    perdida: true,
    motivo_perdida: det ? `${motivo} — ${det}` : motivo,
    estado: 'finalizado'
  });
  closeModal(); render(); toast('Marcado como pérdida');
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
      <input id="peB" type="number" placeholder="1000000" value=""></div>
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
        <select id="bTD">${optsSelect(lista('tipo_doc'), b?.tipo_doc || 'CC')}</select></div>
      <div><label>Número</label>
        <input id="bD" placeholder="1013456789" value="${esc(b?.documento || '')}"></div>
    </div>

    <div class="f2">
      <div><label>Banco</label>
        <select id="bB">${optsSelect(lista('banco'), b?.banco || 'Bancolombia')}</select></div>
      <div><label>Tipo de cuenta</label>
        <select id="bTC">${optsSelect(lista('tipo_cuenta'), b?.tipo_cuenta || 'Ahorros')}</select></div>
    </div>

    <div class="f2">
      <div><label>N° de cuenta</label>
        <input id="bC" placeholder="91234567890" value="${esc(b?.cuenta || '')}"></div>
      <div><label>Teléfono</label>
        <input id="bT" placeholder="3105558877" value="${esc(b?.telefono || '')}"></div>
    </div>

    <div class="f2">
      <div><label>Rol</label>
        <select id="bR">${optsSelect(lista('rol_beneficiario'), b?.rol || 'Mensajero')}</select></div>
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
                'Monto','Reembolsado','Pendiente','Perdida','Motivo perdida',
                'Legalizado','Fecha legalizacion','Observacion'];

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
        g.perdida ? 'SI' : 'NO', g.motivo_perdida || '',
        g.legalizado ? 'SI' : 'NO', g.legalizado_el || '', g.observacion || ''
      ].map(campo).join(';');
    });

  const totales = ['', '', 'TOTALES', '', '', '', '', '', '', '', '', '', '',
                   a.gastado, a.reembolsado, a.pendiente,
                   a.montoPerdido, '', '', '', ''].map(campo).join(';');

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
      <select id="tK">${optsSelect(lista('categoria_caja'), p?.categoria || 'Pago mensajero')}</select></div>
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
