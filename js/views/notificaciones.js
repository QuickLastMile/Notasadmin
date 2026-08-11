function vNotificaciones(){
  const hist=sincronizarHistorialNotificaciones();
  const pendientes=hist.filter(x=>x.activa&&!x.atendida), anteriores=hist.filter(x=>x.atendida||!x.activa);
  const fila=n=>`<div class="notif-fila ${n.atendida?'atendida':''}">
    <button class="notif-contenido" onclick="abrirNotificacion('${n.id}')">
      <span class="notif-ico ${n.tono}">${n.ico}</span><span><strong>${esc(n.titulo)}</strong>
      <small>${esc(n.detalle)}</small><em>${n.fecha===hoyISO()?'Hoy':fechaTxt(n.fecha)}</em></span></button>
    <button class="btn sm" onclick="event.stopPropagation();${n.atendida?`reabrirNotificacion('${n.id}')`:`atenderNotificacion('${n.id}')`}">${n.atendida?'Reabrir':'Atendida'}</button>
  </div>`;
  return `${pageHead('Notificaciones','Todo lo que necesita seguimiento, reunido en un solo lugar.',
    pendientes.length?`<button class="btn" onclick="atenderTodasNotificaciones()">✓ Marcar todo atendido</button>`:'')}
    <div class="notif-resumen"><span class="notif-campana">${ICO.campana}</span><div><strong>${pendientes.length} pendiente${pendientes.length===1?'':'s'}</strong><small>Se actualizan con la información de NEXA.</small></div>
      <button class="btn" onclick="irConfig('notif');go('config')">Configurar avisos</button></div>
    <div class="cfg-tit-sec">Requieren atención</div>
    <div class="notif-lista">${pendientes.length?pendientes.map(fila).join(''):'<div class="notif-vacio">✅ No tienes avisos pendientes.</div>'}</div>
    ${anteriores.length?`<div class="cfg-tit-sec">Historial reciente</div><div class="notif-lista">${anteriores.slice(0,40).map(fila).join('')}</div>`:''}`;
}

