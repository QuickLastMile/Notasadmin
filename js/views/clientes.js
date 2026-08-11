/* ============================================================================
   VISTA: CLIENTES — fuente de información
   ----------------------------------------------------------------------------
   Estructura: CLIENTE → CECO → COLABORADORES → TAREAS.
   Los colaboradores NO son usuarios de la app: son los contactos con los que
   se trabaja (el coordinador, el jefe, el del parqueadero), con su ficha y
   el estado de las tareas que les corresponden.
   ========================================================================== */

let clienteAbierto = null;

function abrirCliente(id){
  clienteAbierto = clienteAbierto === id ? null : id;
  render();
}

function vClientes(){
  if(!S.clientes.length) return `
    ${pageHead('Clientes', 'Ficha por cliente: CECO, colaboradores y todo lo que le debes.', '')}
    ${vacioCTA('◍', 'Empieza por tus clientes',
      'Todo lo demás —tareas, pagos, novedades, colaboradores— se cuelga de un cliente.',
      '+ Nuevo cliente', 'modalCliente()')}`;

  // Los colaboradores sin cliente también deben verse: nada se pierde
  const sueltos = S.colaboradores.filter(c => !c.cliente_id);

  return `
  ${pageHead('Clientes',
    'Ficha por cliente: CECO, colaboradores y todo lo que le debes.',
    `<button class="btn" onclick="modalColaborador()">+ Colaborador</button>
     <button class="btn pri" onclick="modalCliente()">+ Nuevo cliente</button>`)}

  <div class="grid" style="gap:13px">
    ${S.clientes.map(tarjetaCliente).join('')}
    ${sueltos.length ? `
      <div class="card">
        <div class="card-h"><h2>Colaboradores sin cliente</h2>
          <span class="chip n">${sueltos.length}</span></div>
        <div class="card-b flush">${sueltos.map(filaColaborador).join('')}</div>
      </div>` : ''}
  </div>`;
}

function tarjetaCliente(c){
  const abierto = clienteAbierto === c.id;
  const cols = S.colaboradores.filter(x => x.cliente_id === c.id);

  const tks  = S.tareas.filter(t => t.cliente_id === c.id &&
                t.estado !== 'hecho' && t.estado !== 'cancelada');
  const ven  = tks.filter(t => t.vence && diasDesde(t.vence) < 0).length;
  const esp  = tks.filter(t => t.estado === 'en_espera').length;
  const prs  = S.proyectos.filter(p => p.cliente_id === c.id && p.estado !== 'hecho');
  const gas  = suma(S.caja.filter(g => g.tipo === 'gasto' && g.cliente_id === c.id), g => g.monto);
  const nov  = S.novedades.filter(n => n.cliente_id === c.id && n.estado === 'abierta').length;

  const mini = (valor, etiqueta, color = 'inherit') => `
    <div>
      <div style="font-size:17px;font-weight:700;color:${color}">${valor}</div>
      <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;
           letter-spacing:.4px;font-weight:700">${etiqueta}</div>
    </div>`;

  return `
  <div class="card" style="${c.activo === false ? 'opacity:.6' : ''}">
    <button class="card-h" style="width:100%;text-align:left;background:none;cursor:pointer"
            onclick="abrirCliente('${c.id}')">
      <h2>
        <span class="dot" style="background:${c.color}"></span>${esc(c.nombre)}
        ${c.ceco ? `<span class="chip b">CECO ${esc(c.ceco)}</span>` : ''}
        ${c.nit ? `<span class="chip n">NIT ${esc(c.nit)}</span>` : ''}
        ${c.activo === false ? '<span class="chip n">Inactivo</span>' : ''}
      </h2>
      <div style="display:flex;gap:7px;align-items:center">
        ${ven ? `<span class="chip d">${ven} vencida${ven > 1 ? 's' : ''}</span>` : ''}
        ${esp ? `<span class="chip w">⏳ ${esp}</span>` : ''}
        <span class="cfg-chevron">${abierto ? ICO.plegar : ICO.desplegar}</span>
      </div>
    </button>

    <div class="card-b" style="padding-top:12px">
      <div class="grid" style="grid-template-columns:repeat(5,1fr);gap:8px;text-align:center">
        ${mini(tks.length, 'Tareas')}
        ${mini(prs.length, 'Proyectos')}
        ${mini(nov, 'Novedades', nov ? 'var(--danger)' : 'inherit')}
        ${mini(cols.length, 'Personas')}
        <div>
          <div style="font-size:13px;font-weight:700;padding-top:3px">${cop(gas)}</div>
          <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;
               letter-spacing:.4px;font-weight:700">Gasto</div>
        </div>
      </div>
      ${c.notas ? `<p style="font-size:12px;color:var(--text-2);margin-top:11px">📝 ${esc(c.notas)}</p>` : ''}
    </div>

    ${abierto ? `
    <div style="border-top:1px solid var(--border);background:var(--surface-2)">
      <div class="card-h" style="border-bottom:1px solid var(--border)">
        <h2>Colaboradores</h2>
        <div style="display:flex;gap:6px">
          <button class="btn sm" onclick="modalCliente('${c.id}')">✎ Editar cliente</button>
          <button class="btn sm pri" onclick="modalColaborador(null,'${c.id}')">+ Colaborador</button>
        </div>
      </div>
      ${cols.length ? cols.map(filaColaborador).join('')
        : vacio('👤', 'Sin colaboradores registrados para este cliente')}
    </div>` : ''}
  </div>`;
}

/* ---- Fila de colaborador: la ficha y el pulso de sus tareas --------------- */
function filaColaborador(co){
  const tks = S.tareas.filter(t => t.persona_id === co.id);
  const pend = tks.filter(t => t.estado !== 'hecho' && t.estado !== 'cancelada');
  const ven  = pend.filter(t => t.vence && diasDesde(t.vence) < 0).length;
  const esp  = pend.filter(t => t.estado === 'en_espera').length;

  // El último movimiento con esta persona: para saber hace cuánto no se le hace seguimiento
  const ultima = tks
    .map(t => t.completada_el || t.vence)
    .filter(Boolean)
    .sort()
    .at(-1);

  const contacto = [co.celular, co.correo].filter(Boolean);

  return `
  <div class="row" style="${co.activo === false ? 'opacity:.55' : ''}">
    <span class="dot" style="width:9px;height:9px;background:${cli(co.cliente_id).color}"></span>
    <div class="row-main">
      <div class="row-t">${esc(co.nombre)}
        <span class="chip n">${esc(co.cargo || '—')}</span>
        ${co.activo === false ? '<span class="chip n">Inactivo</span>' : ''}
      </div>
      <div class="row-s">
        ${co.cedula ? `<span>CC ${esc(co.cedula)}</span>` : ''}
        ${co.area ? `<span>${esc(co.area)}</span>` : ''}
        ${co.ciudad ? `<span>${esc(co.ciudad)}</span>` : ''}
        ${contacto.length ? `<span>${contacto.map(esc).join(' · ')}</span>` : ''}
      </div>
      <div class="row-s" style="margin-top:3px">
        <span>Pendientes: <strong>${pend.length}</strong></span>
        ${ven ? `<span style="color:var(--danger)">Vencidas: <strong>${ven}</strong></span>` : ''}
        ${esp ? `<span style="color:var(--warn)">En espera: <strong>${esp}</strong></span>` : ''}
        ${ultima ? `<span>Último seguimiento: ${fechaTxt(ultima)}</span>` : ''}
        ${co.notas ? `<span title="${esc(co.notas)}">📝 ${esc(co.notas.slice(0, 40))}${co.notas.length > 40 ? '…' : ''}</span>` : ''}
      </div>
    </div>
    ${co.celular ? `
      <a class="btn sm" href="https://wa.me/${normalizarWhatsapp(co.celular)}" target="_blank"
         rel="noopener" title="Escribirle por WhatsApp" onclick="event.stopPropagation()">💬</a>` : ''}
    ${menuAcciones([
      ['Nueva tarea para él/ella', `tareaParaPersona('${co.id}')`],
      ['Editar',   `modalColaborador('${co.id}')`],
      ['Eliminar', `eliminarColaborador('${co.id}')`, 'peligro']
    ])}
  </div>`;
}
