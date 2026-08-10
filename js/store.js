/* ============================================================================
   STORE — el estado en memoria (S) y los cálculos de negocio
   ========================================================================== */

let S = null;   // estado global

const COLECCIONES = ['clientes','beneficiarios','periodos','presupuestos','caja',
                     'proyectos','tareas','novedades','dashboards','rutina'];

/* ---- Persistencia -------------------------------------------------------- */
const save = () => localStorage.setItem(CFG.storageKey, JSON.stringify(S));

function load(){
  try{ S = JSON.parse(localStorage.getItem(CFG.storageKey)) || seed(); }
  catch{ S = seed(); }
  if(!S || !S.clientes) S = seed();
  for(const k of COLECCIONES) S[k] ||= [];   // tolera guardados de versiones viejas
  save();
}

function resetDemo(){
  if(!confirm('Esto restaura los datos de ejemplo y borra lo que hayas agregado. ¿Continuar?')) return;
  S = seed(); save(); render(); toast('Datos de ejemplo restaurados');
}

/* ---- Búsquedas rápidas --------------------------------------------------- */
const cli = id => S.clientes.find(c => c.id === id)      || {nombre:'Sin cliente', color:'#8a95a3'};
const pro = id => S.proyectos.find(p => p.id === id)     || null;
const ben = id => S.beneficiarios.find(b => b.id === id) || null;
const per = id => S.periodos.find(p => p.id === id)      || null;

/** El período de caja abierto (donde caen los movimientos nuevos). */
const periodoActivo = () => S.periodos.find(p => p.estado === 'abierto')
                         || S.periodos[S.periodos.length - 1]
                         || null;

/* ---- Caja: arqueo de un período ------------------------------------------ */
/**
 * Todo lo que hay que saber de un período de caja.
 * `pendiente` = lo que gastaste y todavía no te han devuelto.
 */
function arqueo(periodoId){
  const movs   = S.caja.filter(g => g.periodo_id === periodoId);
  const gastos = movs.filter(g => g.tipo === 'gasto');

  const base   = suma(movs.filter(g => g.tipo === 'ingreso'), g => g.monto);
  const gastado = suma(gastos, g => g.monto);
  const saldo  = base - gastado;

  const reembolsado = suma(gastos, g => g.reembolsado || 0);
  const pendiente   = gastado - reembolsado;

  const sinLegalizar = gastos.filter(g => !g.legalizado);
  const montoSinLeg  = suma(sinLegalizar, g => g.monto);

  // Un gasto está "sin soporte" si le falta comprobante de pago o factura
  const sinSoporte = gastos.filter(g => !g.tiene_comprobante || !g.tiene_factura);

  // Lo que ya podrías cobrar: legalizado y aún no reembolsado
  const cobrable = suma(gastos.filter(g => g.legalizado), g => g.monto - (g.reembolsado || 0));
  // Lo que está trabado por falta de legalización
  const trabado  = suma(sinLegalizar, g => g.monto - (g.reembolsado || 0));

  return { movs, gastos, base, gastado, saldo, pctUsado: pct(gastado, base),
           reembolsado, pendiente, cobrable, trabado,
           sinLegalizar, montoSinLeg, sinSoporte };
}

/** Gasto del período por categoría, contrastado contra su tope de presupuesto. */
function presupuestoVs(periodoId){
  const gastos = S.caja.filter(g => g.periodo_id === periodoId && g.tipo === 'gasto');
  return S.presupuestos.map(p => {
    const gastado = suma(gastos.filter(g => g.categoria === p.categoria), g => g.monto);
    return { ...p, gastado, pct: pct(gastado, p.tope), excedido: gastado > p.tope };
  }).sort((a, b) => b.pct - a.pct);
}

/* ---- Métricas globales: la fuente única de todas las alertas -------------- */
function metricas(){
  const pendientes = S.tareas.filter(t => t.estado !== 'hecho');
  const vencidas = pendientes.filter(t => t.vence && diasDesde(t.vence) <  0);
  const hoy      = pendientes.filter(t => t.vence && diasDesde(t.vence) === 0);
  const semana   = pendientes.filter(t => t.vence && diasDesde(t.vence) > 0 && diasDesde(t.vence) <= 7);

  const pa = periodoActivo();
  const a  = arqueo(pa?.id);
  const presupuestosExcedidos = pa ? presupuestoVs(pa.id).filter(p => p.excedido) : [];

  const novAbiertas = S.novedades.filter(n => n.estado === 'abierta');
  const novCriticas = novAbiertas.filter(n => n.criticidad === 'alta');

  const proyActivos = S.proyectos.filter(p => p.estado !== 'hecho');
  const proyRiesgo  = proyActivos.filter(p =>
    p.estado === 'en_riesgo' || (p.vence && diasDesde(p.vence) < 3));

  return { pendientes, vencidas, hoy, semana,
           periodo: pa, arqueo: a, presupuestosExcedidos,
           novAbiertas, novCriticas, proyActivos, proyRiesgo };
}
