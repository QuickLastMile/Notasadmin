/* ============================================================================
   VISTA: CLIENTES — fuente de información
   ----------------------------------------------------------------------------
   Estructura: CLIENTE → CECO → COLABORADORES → TAREAS.
   Los colaboradores NO son usuarios de la app: son los contactos con los que
   se trabaja (el coordinador, el jefe, el del parqueadero), con su ficha y
   el estado de las tareas que les corresponden.
   ========================================================================== */

let clienteAbierto = null;
let colabAbierto   = null;

function abrirCliente(id){
  clienteAbierto = clienteAbierto === id ? null : id;
  if(!clienteAbierto) colabAbierto = null;   // al cerrar el cliente, cerrar su ficha
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

/* ---- Fila de colaborador: se expande al tocarla --------------------------- */
function abrirColaborador(id){
  colabAbierto = colabAbierto === id ? null : id;
  render();
}

function filaColaborador(co){
  const abierto = colabAbierto === co.id;

  const tks  = S.tareas.filter(t => t.persona_id === co.id);
  const pend = tks.filter(t => t.estado !== 'hecho' && t.estado !== 'cancelada');
  const ven  = pend.filter(t => t.vence && diasDesde(t.vence) < 0).length;
  const esp  = pend.filter(t => t.estado === 'en_espera').length;
  const hechas = tks.filter(t => t.estado === 'hecho');

  const novs = S.novedades.filter(n => n.persona_id === co.id);
  const novAbiertas = novs.filter(n => n.estado !== 'cerrada').length;
  const evs = S.eventos.filter(e => e.persona_id === co.id);

  // El último movimiento con esta persona: hace cuánto no se le hace seguimiento
  const ultima = tks.map(t => t.completada_el || t.vence).filter(Boolean).sort().at(-1);
  const contacto = [co.celular, co.correo].filter(Boolean);

  return `
  <div class="colab ${abierto ? 'abierto' : ''} ${co.activo === false ? 'inactivo' : ''}">
    <div class="row" style="cursor:pointer" onclick="abrirColaborador('${co.id}')">
      <span class="dot" style="width:9px;height:9px;background:${cli(co.cliente_id).color}"></span>
      <div class="row-main">
        <div class="row-t">${esc(co.nombre)}
          <span class="chip n">${esc(co.cargo || '—')}</span>
          ${ven ? `<span class="chip d">${ven} vencida${ven > 1 ? 's' : ''}</span>` : ''}
          ${esp ? `<span class="chip w">⏳ ${esp}</span>` : ''}
          ${novAbiertas ? `<span class="chip d">⚠ ${novAbiertas}</span>` : ''}
          ${co.activo === false ? '<span class="chip n">Inactivo</span>' : ''}
        </div>
        <div class="row-s">
          ${co.cedula ? `<span>CC ${esc(co.cedula)}</span>` : ''}
          ${co.area ? `<span>${esc(co.area)}</span>` : ''}
          ${contacto.length ? `<span>${contacto.map(esc).join(' · ')}</span>` : ''}
          <span>${pend.length} pendiente${pend.length === 1 ? '' : 's'}</span>
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
      <span class="cfg-chevron">${abierto ? ICO.plegar : ICO.desplegar}</span>
    </div>

    ${abierto ? `
    <div class="colab-detalle">

      <div class="colab-datos">
        ${[['Cédula', co.cedula], ['Cargo', co.cargo], ['Área', co.area],
           ['Ciudad', co.ciudad], ['Celular', co.celular], ['Correo', co.correo]]
          .filter(([, v]) => v).map(([k, v]) => `
            <div><span>${k}</span><strong>${esc(v)}</strong></div>`).join('')}
      </div>

      ${co.notas ? `<div class="tf-notas" style="margin-bottom:13px">${esc(co.notas)}</div>` : ''}

      <div class="colab-cifras">
        ${[[pend.length, 'Pendientes', ''],
           [ven, 'Vencidas', ven ? 'var(--danger)' : ''],
           [esp, 'En espera', esp ? 'var(--warn)' : ''],
           [hechas.length, 'Completadas', hechas.length ? 'var(--ok)' : ''],
           [novs.length, 'Novedades', novAbiertas ? 'var(--danger)' : '']
          ].map(([v, l, c]) => `
          <div><strong style="${c ? `color:${c}` : ''}">${v}</strong><span>${l}</span></div>`).join('')}
      </div>

      ${ultima ? `<div class="colab-ultimo">Último seguimiento: ${fechaTxt(ultima)}</div>` : ''}

      ${pend.length ? `
        <div class="tf-tit" style="margin-top:16px"><span>Tareas pendientes</span></div>
        <div class="colab-lista">${pend.sort(ordenTareas).map(rowTarea).join('')}</div>` : ''}

      ${novs.length ? `
        <div class="tf-tit"><span>Novedades relacionadas</span></div>
        <div class="colab-lista">${novs.slice(0, 5).map(filaNovedad).join('')}</div>` : ''}

      ${evs.length ? `
        <div class="tf-tit"><span>En el calendario</span></div>
        <div class="colab-lista">
          ${evs.map(ev => {
            const prox = proximaOcurrencia(ev);
            return `<div class="row" style="cursor:pointer" onclick="verEvento('${ev.id}')">
              <span style="font-size:18px">${tipoEvento(ev.tipo).ico}</span>
              <div class="row-main">
                <div class="row-t">${esc(ev.titulo)}</div>
                <div class="row-s"><span>${prox ? fechaTxt(prox) : 'Ya pasó'}</span></div>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

      <div class="colab-acciones">
        <button class="btn" onclick="modalColaborador('${co.id}')">✎ Editar datos</button>
        ${co.celular ? `<a class="btn" href="https://wa.me/${normalizarWhatsapp(co.celular)}"
           target="_blank" rel="noopener">💬 Escribirle</a>` : ''}
        ${co.correo ? `<a class="btn" href="mailto:${esc(co.correo)}">✉ Correo</a>` : ''}
        <button class="btn pri" onclick="tareaParaPersona('${co.id}')">+ Tarea</button>
      </div>
    </div>` : ''}
  </div>`;
}
