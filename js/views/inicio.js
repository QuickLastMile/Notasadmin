/* ============================================================================
   VISTA: INICIO — lo primero que ves. Solo lo que necesita tu atención.
   ========================================================================== */

/** Construye la lista de alertas del día a partir de las métricas. */
function alertasDelDia(m){
  const a = [];

  if(m.vencidas.length)
    a.push({ tono:'d', ico:'⏰',
      titulo:`${m.vencidas.length} tarea${m.vencidas.length > 1 ? 's' : ''} vencida${m.vencidas.length > 1 ? 's' : ''}`,
      sub: m.vencidas.slice(0, 2).map(t => t.titulo).join(' · '), ir:'tareas' });

  if(m.novCriticas.length)
    a.push({ tono:'d', ico:'⚠️',
      titulo:`${m.novCriticas.length} novedad${m.novCriticas.length > 1 ? 'es' : ''} crítica${m.novCriticas.length > 1 ? 's' : ''} sin cerrar`,
      sub: m.novCriticas[0].titulo, ir:'novedades' });

  const q = m.arqueo;

  if(q.sinLegalizar.length)
    a.push({ tono:'w', ico:'🧾',
      titulo:`${q.sinLegalizar.length} movimientos sin legalizar`,
      sub:`${cop(q.montoSinLeg)} · ${q.sinSoporte.length} sin comprobante o factura`, ir:'caja' });

  if(q.cobrable > 0)
    a.push({ tono:'w', ico:'💰',
      titulo:`${cop(q.cobrable)} listos para cobrar`,
      sub:`Ya legalizados y sin reembolsar${q.trabado > 0 ? ` · otros ${cop(q.trabado)} trabados sin legalizar` : ''}`,
      ir:'caja' });

  if(q.pctUsado >= CFG.topeAlertaCaja)
    a.push({ tono:'w', ico:'💸',
      titulo:`Caja menor al ${Math.round(q.pctUsado * 100)}%`,
      sub:`Quedan ${cop(q.saldo)} de la base — considera pedir reembolso`, ir:'caja' });

  if(q.montoPerdido > 0)
    a.push({ tono:'d', ico:'📉',
      titulo:`${cop(q.montoPerdido)} en pérdidas este período`,
      sub:`${q.perdidas.length} gasto${q.perdidas.length > 1 ? 's' : ''} que ya no vas a recuperar · ${Math.round(q.pctPerdido * 100)}% de lo gastado`,
      ir:'caja' });

  if(m.presupuestosExcedidos.length)
    a.push({ tono:'d', ico:'🎯',
      titulo:`${m.presupuestosExcedidos.length} categoría${m.presupuestosExcedidos.length > 1 ? 's' : ''} sobre el tope`,
      sub: m.presupuestosExcedidos.map(p => `${p.categoria}: ${cop(p.gastado)} de ${cop(p.tope)}`).join(' · '),
      ir:'caja' });

  if(m.proyRiesgo.length)
    a.push({ tono:'w', ico:'📁',
      titulo:`${m.proyRiesgo.length} proyecto${m.proyRiesgo.length > 1 ? 's' : ''} en riesgo`,
      sub: m.proyRiesgo.map(p => p.nombre).join(' · '), ir:'proyectos' });

  if(!a.length)
    a.push({ tono:'o', ico:'✅', titulo:'Todo bajo control',
      sub:'No hay vencidos, críticos ni pendientes de legalizar', ir:'inicio' });

  return a;
}

/* ---- Arranque guiado: solo se ve mientras la app está vacía --------------- */
function vArranque(){
  const pasos = [
    { hecho: S.clientes.length > 0,
      titulo:'Crea tus clientes',
      sub:'Cafam, Diebold, Alfagres… Todo lo demás se cuelga de aquí.',
      btn:'+ Cliente', accion:'modalCliente()' },
    { hecho: S.beneficiarios.length > 0,
      titulo:'Registra tus mensajeros y proveedores',
      sub:'Nombre, CC o NIT, banco y número de cuenta. Se guardan una sola vez.',
      btn:'+ Mensajero', accion:'modalBeneficiario()' },
    { hecho: S.periodos.length > 0,
      titulo:'Abre el período de caja del mes',
      sub:'Con la base que te asignaron. Sin período no puedes registrar pagos.',
      btn:'+ Período', accion:'modalPeriodo()' },
    { hecho: S.rutina.length > 0,
      titulo:'Arma tu rutina diaria',
      sub:'Lo que revisas todos los días sin falta. Se reinicia cada mañana.',
      btn:'+ Paso', accion:'modalRutina()' }
  ];
  const listos = pasos.filter(p => p.hecho).length;

  return `
  ${pageHead('Empecemos 🚀',
    'La app está en blanco, lista para tus datos reales. Estos cuatro pasos la dejan funcionando.',
    `<button class="btn" onclick="cargarEjemplo()">Ver con datos de ejemplo</button>`)}

  <div class="card" style="max-width:720px">
    <div class="card-h"><h2>Primeros pasos</h2>
      <span class="chip ${listos === pasos.length ? 'o' : 'n'}">${listos}/${pasos.length}</span></div>
    <div class="card-b flush">
      ${pasos.map(p => `
        <div class="row ${p.hecho ? 'done' : ''}">
          <span class="chk ${p.hecho ? 'on' : ''}" style="cursor:default">✓</span>
          <div class="row-main">
            <div class="row-t">${esc(p.titulo)}</div>
            <div class="row-s"><span>${esc(p.sub)}</span></div>
          </div>
          ${p.hecho ? '<span class="chip o">Listo</span>'
                    : `<button class="btn pri sm" onclick="${p.accion}">${p.btn}</button>`}
        </div>`).join('')}
    </div>
  </div>

  <div class="card" style="max-width:720px;margin-top:14px">
    <div class="card-h"><h2>⚡ O captura directo</h2></div>
    <div class="card-b" style="font-size:13px;color:var(--text-2);display:grid;gap:7px">
      <div>Escribe en la barra de arriba (tecla <code>/</code>) y se crea solo:</div>
      <div><code>t: llamar al coordinador mañana !alta</code> → tarea</div>
      <div><code>n: se cayó el dashboard !alta</code> → novedad</div>
      <div><code>p: Informe mensual</code> → proyecto</div>
      <div style="color:var(--text-3);font-size:12px;margin-top:3px">
        Para pagos de caja usa el formulario completo, que pide beneficiario y soportes.</div>
    </div>
  </div>`;
}

function vInicio(m){
  if(sinDatos()) return vArranque();

  const rutHechas = S.rutina.filter(r => r.hecho_el === hoyISO()).length;

  // Foco: primero lo vencido, luego lo de hoy; las de prioridad alta arriba
  const orden = { alta:0, media:1, baja:2 };
  const foco = [...m.vencidas, ...m.hoy]
    .sort((a, b) => orden[a.prioridad] - orden[b.prioridad])
    .slice(0, 6);

  return `
  ${pageHead('Buen día 👋', 'Esto es lo que necesita tu atención antes que nada.',
    `<button class="btn pri" onclick="$('#cap').focus()">⚡ Capturar algo</button>`)}

  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Vencidas', m.vencidas.length, `${m.hoy.length} vencen hoy`, m.vencidas.length ? 'd' : 'o')}
    ${kpi('Saldo caja menor', cop(m.arqueo.saldo),
          `${Math.round(m.arqueo.pctUsado * 100)}% de la base usado`,
          m.arqueo.pctUsado >= CFG.topeAlertaCaja ? 'w' : 'p')}
    ${kpi('Te deben', cop(m.arqueo.pendiente),
          `${cop(m.arqueo.cobrable)} ya cobrables`, m.arqueo.pendiente > 0 ? 'w' : 'o')}
    ${kpi('Novedades abiertas', m.novAbiertas.length, `${m.novCriticas.length} críticas`,
          m.novCriticas.length ? 'd' : 'o')}
    ${kpi('Proyectos activos', m.proyActivos.length, `${m.proyRiesgo.length} en riesgo`)}
  </div>

  <div class="grid g2">

    <!-- Alertas -->
    <div class="card">
      <div class="card-h"><h2>🚨 Alertas del día</h2></div>
      <div class="card-b" style="display:grid;gap:8px">
        ${alertasDelDia(m).map(a => `
          <div class="alert ${a.tono}" style="cursor:pointer" onclick="go('${a.ir}')">
            <span>${a.ico}</span>
            <div class="a-txt"><b>${esc(a.titulo)}</b><small>${esc(a.sub)}</small></div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Foco de hoy -->
    <div class="card">
      <div class="card-h"><h2>🎯 Foco de hoy</h2><span class="chip n">${foco.length} tareas</span></div>
      <div class="card-b flush">
        ${foco.length ? foco.map(rowTarea).join('') : vacio('🎉', 'Nada urgente para hoy')}
      </div>
    </div>

    <!-- Rutina diaria -->
    <div class="card">
      <div class="card-h"><h2>🔁 Rutina diaria</h2>
        <div style="display:flex;gap:6px;align-items:center">
          ${S.rutina.length ? `<span class="chip ${rutHechas === S.rutina.length ? 'o' : 'n'}">${rutHechas}/${S.rutina.length}</span>` : ''}
          <button class="btn sm" onclick="modalRutina()">+ Paso</button>
        </div>
      </div>
      <div class="card-b flush">
        ${S.rutina.length ? S.rutina.map(r => {
          const on = r.hecho_el === hoyISO();
          return `<div class="row ${on ? 'done' : ''}">
            <button class="chk ${on ? 'on' : ''}" onclick="toggleRutina('${r.id}')">✓</button>
            <div class="row-main"><div class="row-t">${esc(r.texto)}</div></div>
            <div class="row-act">
              <button class="btn sm dgr" onclick="borrar('rutina','${r.id}')">✕</button>
            </div>
          </div>`;
        }).join('') : vacio('🔁', 'Agrega lo que revisas todos los días')}
      </div>
    </div>

    <!-- Novedades abiertas -->
    <div class="card">
      <div class="card-h"><h2>⚠️ Novedades abiertas</h2>
        <button class="btn sm" onclick="go('novedades')">Ver todo</button></div>
      <div class="card-b flush">
        ${m.novAbiertas.length ? m.novAbiertas.slice(0, 4).map(n => `
          <div class="row">
            <span class="dot" style="width:9px;height:9px;background:${colorNivel(n.criticidad)}"></span>
            <div class="row-main">
              <div class="row-t">${esc(n.titulo)}</div>
              <div class="row-s">
                <span>${cliTag(n.cliente_id)}</span>
                <span>${fechaTxt(n.fecha)}</span>
                ${n.accion ? `<span>→ ${esc(n.accion)}</span>` : ''}
              </div>
            </div>
            <button class="btn sm" onclick="cerrarNovedad('${n.id}')">Cerrar</button>
          </div>`).join('') : vacio('🟢', 'Sin novedades abiertas')}
      </div>
    </div>

  </div>`;
}
