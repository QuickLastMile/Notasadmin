/* ============================================================================
   EVENTOS DE AGENDA
   ----------------------------------------------------------------------------
   Un cumpleaños no es una tarea: no se completa, se repite cada año y no
   vence. Una reunión tampoco: se atiende, no se marca hecha. Meterlos como
   tareas ensuciaría los KPIs de atrasadas.

   Por eso los eventos viven aparte, pero se pintan en el mismo calendario
   junto a las tareas.

   Cada tipo pide lo que de verdad necesita. El formulario se arma solo a
   partir de `campos`, así que agregar un tipo nuevo es agregar una entrada
   aquí — no tocar el formulario.
   ========================================================================== */

const TIPOS_EVENTO = {
  cumple: {
    l:'Cumpleaños', ico:'🎂', color:'#B8860B',
    ayuda:'Se repite cada año. Te avisa con los días de anticipación que pongas.',
    anual: true,
    campos: ['persona', 'aviso']
  },
  reunion: {
    l:'Reunión', ico:'👥', color:'#800000',
    ayuda:'Con hora, lugar y quiénes van.',
    campos: ['horas', 'lugar', 'asistentes', 'agenda', 'cliente', 'aviso']
  },
  evento: {
    l:'Evento', ico:'📅', color:'#633A2C',
    ayuda:'Algo que dura uno o varios días: una feria, una capacitación, un viaje.',
    campos: ['rango', 'lugar', 'cliente', 'aviso']
  },
  vencimiento: {
    l:'Vencimiento', ico:'💰', color:'#CE3B26',
    ayuda:'Un pago o una fecha límite con plata de por medio.',
    campos: ['monto', 'beneficiario', 'cliente', 'aviso']
  },
  recordatorio: {
    l:'Recordatorio', ico:'🔔', color:'#3F6B4A',
    ayuda:'Algo que solo hay que tener presente ese día.',
    campos: ['aviso']
  }
};

const tipoEvento = t => TIPOS_EVENTO[t] || TIPOS_EVENTO.recordatorio;

const AVISOS = {
  0:'El mismo día', 1:'1 día antes', 3:'3 días antes',
  7:'Una semana antes', 15:'15 días antes', 30:'Un mes antes'
};

/* ---- Cálculo de ocurrencias ----------------------------------------------
   Un cumpleaños guardado como 1990-05-12 debe caer el 12 de mayo de CADA
   año. Se compara solo mes y día, no el año guardado.
   -------------------------------------------------------------------------- */

/** ¿Este evento cae en esta fecha (ISO)? */
function eventoEnFecha(ev, iso){
  if(!ev.fecha) return false;

  if(tipoEvento(ev.tipo).anual)
    return ev.fecha.slice(5) === iso.slice(5);   // mismo mes-día

  // Los que tienen rango ocupan todos los días entre inicio y fin
  const fin = ev.fecha_fin || ev.fecha;
  return iso >= ev.fecha && iso <= fin;
}

/** La próxima vez que ocurre, contando desde hoy. Null si ya pasó y no se repite. */
function proximaOcurrencia(ev){
  if(!ev.fecha) return null;
  const hoy = hoyISO();

  if(tipoEvento(ev.tipo).anual){
    const anio = +hoy.slice(0, 4);
    const esteAnio = anio + '-' + ev.fecha.slice(5);
    return esteAnio >= hoy ? esteAnio : (anio + 1) + '-' + ev.fecha.slice(5);
  }

  const fin = ev.fecha_fin || ev.fecha;
  return fin >= hoy ? ev.fecha : null;
}

/** Eventos que hay que tener presentes ya, según su aviso configurado. */
function eventosProximos(dias = 30){
  return S.eventos
    .map(ev => ({ ev, cuando: proximaOcurrencia(ev) }))
    .filter(x => x.cuando)
    .map(x => ({ ...x, faltan: diasDesde(x.cuando) }))
    .filter(x => x.faltan >= 0 && x.faltan <= dias)
    .sort((a, b) => a.faltan - b.faltan);
}

/** Los que ya entraron en su ventana de aviso: son los que van a Inicio. */
const eventosEnAviso = () => eventosProximos(60)
  .filter(x => x.faltan <= (x.ev.aviso ?? 1));

/** Cuántos años cumple. Solo tiene sentido si guardaron el año de nacimiento. */
function edadEn(ev, iso){
  if(!tipoEvento(ev.tipo).anual) return null;
  const nacimiento = +ev.fecha.slice(0, 4);
  const anio = +iso.slice(0, 4);
  const edad = anio - nacimiento;
  return (edad > 0 && edad < 130) ? edad : null;
}

/* ---- Etiqueta corta, para el calendario y las listas ---------------------- */
function tituloEvento(ev, iso = null){
  const t = tipoEvento(ev.tipo);
  const edad = iso ? edadEn(ev, iso) : null;
  return `${t.ico} ${ev.titulo}${edad ? ` (${edad})` : ''}`;
}
