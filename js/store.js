/* ============================================================================
   STORE — el estado en memoria (S) y los cálculos de negocio
   ========================================================================== */

let S = null;   // estado global: { clientes, proyectos, tareas, caja, novedades, dashboards, rutina }

/* ---- Persistencia -------------------------------------------------------- */
const save = () => localStorage.setItem(CFG.storageKey, JSON.stringify(S));

function load(){
  try{ S = JSON.parse(localStorage.getItem(CFG.storageKey)) || seed(); }
  catch{ S = seed(); }
  if(!S || !S.clientes) S = seed();
  // Asegura que existan todas las colecciones aunque el guardado sea viejo
  for(const k of ['clientes','proyectos','tareas','caja','novedades','dashboards','rutina'])
    S[k] ||= [];
  save();
}

function resetDemo(){
  if(!confirm('Esto restaura los datos de ejemplo y borra lo que hayas agregado. ¿Continuar?')) return;
  S = seed(); save(); render(); toast('Datos de ejemplo restaurados');
}

/* ---- Búsquedas rápidas --------------------------------------------------- */
const cli = id => S.clientes.find(c => c.id === id)  || {nombre:'Sin cliente', color:'#8a95a3'};
const pro = id => S.proyectos.find(p => p.id === id) || null;

/* ---- Métricas: la fuente única de verdad de todas las alertas ------------ */
function metricas(){
  const pendientes = S.tareas.filter(t => t.estado !== 'hecho');
  const vencidas = pendientes.filter(t => t.vence && diasDesde(t.vence) <  0);
  const hoy      = pendientes.filter(t => t.vence && diasDesde(t.vence) === 0);
  const semana   = pendientes.filter(t => t.vence && diasDesde(t.vence) > 0 && diasDesde(t.vence) <= 7);

  const gastos = S.caja.filter(g => g.tipo === 'gasto');
  const ing    = suma(S.caja.filter(g => g.tipo === 'ingreso'), g => g.monto);
  const gas    = suma(gastos, g => g.monto);
  const saldo  = ing - gas;
  const pctUsado = pct(gas, ing);

  const sinLegalizar = gastos.filter(g => !g.legalizado);
  const montoSinLeg  = suma(sinLegalizar, g => g.monto);
  const sinSoporte   = gastos.filter(g => !g.soporte);

  const novAbiertas = S.novedades.filter(n => n.estado === 'abierta');
  const novCriticas = novAbiertas.filter(n => n.criticidad === 'alta');

  const proyActivos = S.proyectos.filter(p => p.estado !== 'hecho');
  const proyRiesgo  = proyActivos.filter(p =>
    p.estado === 'en_riesgo' || (p.vence && diasDesde(p.vence) < 3));

  return { pendientes, vencidas, hoy, semana,
           ing, gas, saldo, pctUsado, sinLegalizar, montoSinLeg, sinSoporte,
           novAbiertas, novCriticas, proyActivos, proyRiesgo };
}
