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

  if(m.sinLegalizar.length)
    a.push({ tono:'w', ico:'🧾',
      titulo:`${m.sinLegalizar.length} gastos sin legalizar`,
      sub:`${cop(m.montoSinLeg)} pendientes de soporte`, ir:'caja' });

  if(m.pctUsado >= CFG.topeAlertaCaja)
    a.push({ tono:'w', ico:'💸',
      titulo:`Caja menor al ${Math.round(m.pctUsado * 100)}%`,
      sub:`Quedan ${cop(m.saldo)} — considera pedir reembolso`, ir:'caja' });

  if(m.proyRiesgo.length)
    a.push({ tono:'w', ico:'📁',
      titulo:`${m.proyRiesgo.length} proyecto${m.proyRiesgo.length > 1 ? 's' : ''} en riesgo`,
      sub: m.proyRiesgo.map(p => p.nombre).join(' · '), ir:'proyectos' });

  if(!a.length)
    a.push({ tono:'o', ico:'✅', titulo:'Todo bajo control',
      sub:'No hay vencidos, críticos ni pendientes de legalizar', ir:'inicio' });

  return a;
}

function vInicio(m){
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
    ${kpi('Saldo caja menor', cop(m.saldo), `${Math.round(m.pctUsado * 100)}% de la base usado`,
          m.pctUsado >= CFG.topeAlertaCaja ? 'w' : 'p')}
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
        <span class="chip ${rutHechas === S.rutina.length ? 'o' : 'n'}">${rutHechas}/${S.rutina.length}</span></div>
      <div class="card-b flush">
        ${S.rutina.map(r => {
          const on = r.hecho_el === hoyISO();
          return `<div class="row ${on ? 'done' : ''}">
            <button class="chk ${on ? 'on' : ''}" onclick="toggleRutina('${r.id}')">✓</button>
            <div class="row-main"><div class="row-t">${esc(r.texto)}</div></div>
          </div>`;
        }).join('')}
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
