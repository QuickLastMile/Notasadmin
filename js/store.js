/* ============================================================================
   STORE — el estado en memoria (S) y los cálculos de negocio
   ========================================================================== */

let S = null;   // estado global

const COLECCIONES = ['clientes','beneficiarios','periodos','presupuestos','caja',
                     'proyectos','tareas','novedades','dashboards','rutina','listas','preguntas',
                     'formularios','respuestas','campos_personalizados','colaboradores','eventos',
                     'notas_carpetas','notas'];

/* ---- Persistencia -------------------------------------------------------- */
const save = () => localStorage.setItem(CFG.storageKey, JSON.stringify(S));

/** Estructura vacía: la app arranca en blanco, lista para tus datos reales. */
const vacia = () => Object.fromEntries(COLECCIONES.map(k => [k, []]));

/** Garantiza que existan todas las colecciones, venga de donde venga el objeto.
    Sin esto, un guardado viejo o un seed incompleto rompen las vistas. */
function normalizar(obj){
  const o = (obj && typeof obj === 'object') ? obj : vacia();
  for(const k of COLECCIONES) if(!Array.isArray(o[k])) o[k] = [];
  return o;
}

function load(){
  try{ S = normalizar(JSON.parse(localStorage.getItem(CFG.storageKey))); }
  catch{ S = vacia(); }
  save();
}

/** ¿Está la app completamente vacía? (para mostrar el arranque guiado) */
const sinDatos = () => COLECCIONES.every(k => !S[k].length);

function cargarEjemplo(){
  // Los ids del seed son 'c1', 'p1'… y Supabase espera uuid: solo aplica en local
  if(NUBE){ toast('Los datos de ejemplo solo están en modo local'); return; }
  if(!sinDatos() && !confirm('Esto reemplaza TODO lo que tienes por datos de ejemplo. ¿Continuar?')) return;
  S = normalizar(seed()); save(); render(); toast('Datos de ejemplo cargados');
}

async function vaciarTodo(){
  if(!confirm('Esto borra todos tus datos y deja la app en blanco. No se puede deshacer.\n\n¿Continuar?')) return;
  if(!confirm('Confirma otra vez: se borra TODO — clientes, mensajeros, caja, tareas y novedades.')) return;

  if(NUBE) await vaciarNube();
  else { S = vacia(); save(); }

  render(); toast('Todo borrado — la app quedó en blanco');
}

/* ---- Búsquedas rápidas --------------------------------------------------- */
const cli = id => S.clientes.find(c => c.id === id)      || {nombre:'Sin cliente', color:'#8a95a3'};
const pro = id => S.proyectos.find(p => p.id === id)     || null;
const ben = id => S.beneficiarios.find(b => b.id === id) || null;
const per = id => S.periodos.find(p => p.id === id)      || null;
const colab = id => S.colaboradores.find(c => c.id === id) || null;

/** El período de caja abierto (donde caen los movimientos nuevos). */
const periodoActivo = () => S.periodos.find(p => p.estado === 'abierto')
                         || S.periodos[S.periodos.length - 1]
                         || null;

/** Avance visible del proyecto: automático por tareas o manual si así se eligió. */
function avanceProyecto(p){
  const tareas = S.tareas.filter(t => t.proyecto_id === p.id && t.estado !== 'cancelada');
  const hechas = tareas.filter(t => t.estado === 'hecho').length;
  const automatico = (p.avance_modo || 'automatico') === 'automatico';
  const avance = p.estado === 'hecho' ? 100 : automatico
    ? (tareas.length ? Math.round(hechas / tareas.length * 100) : 0)
    : Math.max(0, Math.min(100, +(p.avance || 0)));
  return { avance, tareas, hechas, automatico };
}

/* ---- Caja: arqueo de un período ------------------------------------------ */
/**
 * Todo lo que hay que saber de un período de caja.
 * `pendiente` = lo que gastaste y todavía no te han devuelto.
 */
function arqueo(periodoId){
  const movs   = S.caja.filter(g => g.periodo_id === periodoId);
  const gastos = movs.filter(g => g.tipo === 'gasto');
  const periodo = per(periodoId);

  /* La base pertenece al período y no cambia cuando contabilidad devuelve
     gastos. Los reembolsos antiguos pueden seguir visibles en el histórico,
     pero nunca vuelven a inflar la asignación de caja. */
  const ingresosBase = movs.filter(g => g.tipo === 'ingreso'
    && !/reposici[oó]n de base|consignaci[oó]n recibida/i.test(g.concepto || ''));
  const baseAsignada = +(periodo?.base_asignada || 0);
  const base    = baseAsignada || suma(ingresosBase, g => g.monto);
  const gastado = suma(gastos, g => g.monto);

  const reembolsado = suma(gastos, g => g.reembolsado || 0);
  const saldo   = base - gastado + reembolsado;
  const consumoNeto = Math.max(0, gastado - reembolsado);

  /* Pérdidas: gastos que ya diste por no recuperables — rechazados, sin
     soporte, o plata que sencillamente no apareció. Se separan del resto
     porque no son "pendiente por cobrar": nadie te las va a devolver, y
     mezclarlas inflaría lo que crees que te deben. */
  const perdidas      = gastos.filter(g => g.perdida);
  const montoPerdido  = suma(perdidas, g => g.monto - (g.reembolsado || 0));

  const recuperables  = gastos.filter(g => !g.perdida);
  const pendiente     = suma(recuperables, g => g.monto - (g.reembolsado || 0));

  const sinLegalizar = recuperables.filter(g => !g.legalizado);
  const montoSinLeg  = suma(sinLegalizar, g => g.monto);

  // Un gasto está "sin soporte" si le falta comprobante de pago o factura
  const sinSoporte = recuperables.filter(g => !g.tiene_comprobante || !g.tiene_factura);

  // Lo que ya podrías cobrar: legalizado, sin reembolsar y no dado por perdido
  const porCobrar = recuperables.filter(g => g.legalizado && (g.monto - (g.reembolsado || 0)) > 0);
  const cobrable  = suma(porCobrar, g => g.monto - (g.reembolsado || 0));
  // Lo que está trabado por falta de legalización
  const trabado   = suma(sinLegalizar, g => g.monto - (g.reembolsado || 0));

  return { movs, gastos, base, gastado, saldo, consumoNeto, pctUsado: pct(consumoNeto, base),
           reembolsado, pendiente, cobrable, trabado, porCobrar,
           perdidas, montoPerdido, pctPerdido: pct(montoPerdido, gastado),
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

/* ---- Novedades: cuántas salen y cuánto tardan en cerrarse ----------------
   Lo que se quiere responder: "¿cuántas novedades salieron este mes?" y
   "¿estamos mejorando o empeorando?".
   -------------------------------------------------------------------------- */
function estadisticasNovedades(meses = 6){
  const hoy = new Date();

  // Los últimos N meses, del más viejo al más nuevo
  const periodos = [];
  for(let i = meses - 1; i >= 0; i--){
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const delMes = S.novedades.filter(n => (n.fecha || '').startsWith(ym));
    periodos.push({
      ym,
      etiqueta: d.toLocaleDateString('es-CO', { month:'short' }).replace('.', ''),
      nombre: nombreMes(d),
      total: delMes.length,
      criticas: delMes.filter(n => n.criticidad === 'alta').length,
      cerradas: delMes.filter(n => n.estado === 'cerrada').length,
      novedades: delMes
    });
  }

  const esteMes = periodos.at(-1);
  const mesPasado = periodos.at(-2);

  // Solo las cerradas tienen tiempo real de resolución
  const cerradas = S.novedades.filter(n => n.estado === 'cerrada' && n.cerrada_el);
  const promedioDias = cerradas.length
    ? Math.round(suma(cerradas, n => diasResolucion(n)) / cerradas.length * 10) / 10
    : null;

  const agrupar = (campo) => {
    const m = {};
    S.novedades.forEach(n => { const k = n[campo] || 'sin'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  return {
    periodos, esteMes, mesPasado,
    variacion: mesPasado && mesPasado.total
      ? Math.round((esteMes.total - mesPasado.total) / mesPasado.total * 100)
      : null,
    maximo: Math.max(1, ...periodos.map(p => p.total)),
    promedioDias, cerradas,
    porTipo: agrupar('tipo'),
    porCliente: agrupar('cliente_id')
  };
}

/* ---- Métricas globales: la fuente única de todas las alertas -------------- */
function metricas(){
  const pendientes = S.tareas.filter(t => t.estado !== 'hecho' && t.estado !== 'cancelada');
  const vencidas = pendientes.filter(t => t.vence && diasDesde(t.vence) <  0);
  const hoy      = pendientes.filter(t => t.vence && diasDesde(t.vence) === 0);
  const semana   = pendientes.filter(t => t.vence && diasDesde(t.vence) > 0 && diasDesde(t.vence) <= 7);

  const pa = periodoActivo();
  const a  = arqueo(pa?.id);
  const presupuestosExcedidos = pa ? presupuestoVs(pa.id).filter(p => p.excedido) : [];

  /* En espera: tareas donde el balón está en la cancha de otro. Si la fecha
     esperada ya pasó, el seguimiento está atrasado y hay que volver a cobrar. */
  const enEspera       = pendientes.filter(t => t.estado === 'en_espera');
  const esperaAtrasada = enEspera.filter(t => t.espera_fecha && diasDesde(t.espera_fecha) < 0);
  const altaPendiente  = pendientes.filter(t => t.prioridad === 'alta');

  /* Eventos: los de hoy para el contador del menú, y los que ya entraron
     en su ventana de aviso para las alertas de Inicio. */
  const eventosHoy   = S.eventos.filter(ev => eventoEnFecha(ev, hoyISO()));
  const eventosAviso = eventosEnAviso();

  // "Sin cerrar" incluye las que están en gestión: siguen pendientes
  const novAbiertas = S.novedades.filter(n => n.estado !== 'cerrada');
  const novCriticas = novAbiertas.filter(n => n.criticidad === 'alta');
  const novEstancadas = novAbiertas.filter(n => diasResolucion(n) > 7);

  const proyActivos = S.proyectos.filter(p => p.estado !== 'hecho');
  const proyRiesgo  = proyActivos.filter(p =>
    p.estado === 'en_riesgo' || (p.vence && diasDesde(p.vence) < 3));

  return { pendientes, vencidas, hoy, semana,
           enEspera, esperaAtrasada, altaPendiente,
           eventosHoy, eventosAviso,
           periodo: pa, arqueo: a, presupuestosExcedidos,
           novAbiertas, novCriticas, novEstancadas, proyActivos, proyRiesgo };
}
