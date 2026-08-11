/* ============================================================================
   LISTAS EDITABLES
   ----------------------------------------------------------------------------
   Todo desplegable de la app sale de aquí. Antes eran constantes en el código;
   ahora son datos, para que se puedan agregar y quitar desde Configuración
   sin tocar nada.

   Si una lista está vacía se usan los valores por defecto, así la app nunca
   se queda sin opciones.
   ========================================================================== */

const LISTAS = {
  categoria_caja: {
    nombre:'Categorías de caja', icono:'▤',
    ayuda:'En qué se gasta la plata. Salen al registrar un pago.',
    def:['Pago mensajero','Parqueadero','Combustible','Transporte','Peajes',
         'Alimentación','Papelería','Insumos','Servicios','Base','Otros']
  },
  metodo_pago: {
    nombre:'Métodos de pago', icono:'💳',
    ayuda:'Por dónde sale la plata.',
    def:['Nequi','Daviplata','Nu','BBVA','Transferencia','Efectivo']
  },
  banco: {
    nombre:'Bancos', icono:'🏦',
    ayuda:'Para la cuenta de cada mensajero o proveedor.',
    def:['Bancolombia','Davivienda','Nequi','Daviplata','Nu','BBVA',
         'Banco de Bogotá','Banco Agrario','Colpatria','AV Villas','Falabella','Otro']
  },
  tipo_cuenta: {
    nombre:'Tipos de cuenta', icono:'🧾',
    ayuda:'Ahorros, corriente, depósito electrónico…',
    def:['Ahorros','Corriente','Depósito electrónico']
  },
  tipo_doc: {
    nombre:'Tipos de documento', icono:'🪪',
    ayuda:'CC, NIT, CE…',
    def:['CC','NIT','CE','PPT']
  },
  rol_beneficiario: {
    nombre:'Roles de beneficiario', icono:'👷',
    ayuda:'Cómo clasificas a quien recibe el pago.',
    def:['Mensajero','Proveedor','Contratista','Colaborador','Otro']
  },
  categoria_novedad: {
    nombre:'Tipos de novedad', icono:'⚠',
    ayuda:'Para clasificar lo que se sale del guion.',
    def:['Operativa','Sistemas','Documentación','Personal','Cliente','Otra']
  },
  prioridad_tarea: {
    nombre:'Prioridades de tarea', icono:'✓',
    ayuda:'Cuidado al cambiarlas: "alta" es la que dispara las alertas.',
    def:['alta','media','baja']
  },
  categoria: {
    nombre:'Categorías generales', icono:'🏷',
    ayuda:'Agrupan preguntas y campos personalizados.',
    def:['Operación','Seguridad','Vehículos','Entregas','Administrativo','Calidad']
  },
  cargo_colaborador: {
    nombre:'Cargos de colaborador', icono:'👤',
    ayuda:'El cargo de cada contacto en la ficha del cliente.',
    def:['Cliente','Jefe','Líder','Coordinador','Supervisor','Otro']
  },
  tipo_tarea: {
    nombre:'Tipos de tarea', icono:'✓',
    ayuda:'Para distinguir lo personal de lo operativo. Es opcional al crear.',
    def:['Personal','Operativa','Administrativa','Seguimiento','Reunión','Documentación','Otro']
  }
};

/* ---- Estados de una tarea ------------------------------------------------
   Fijos: los KPIs, las alertas y los filtros razonan sobre ellos.
   -------------------------------------------------------------------------- */
const ESTADOS_TAREA = {
  pendiente:  { l:'Pendiente',  c:'n' },
  en_proceso: { l:'En proceso', c:'b' },
  en_espera:  { l:'En espera',  c:'w' },
  hecho:      { l:'Hecha',      c:'o' },
  cancelada:  { l:'Cancelada',  c:'n' }
};

/* ---- Tipos de respuesta de una pregunta ----------------------------------
   Fijos: el formulario se dibuja distinto según el tipo, así que no se
   pueden inventar valores nuevos sin código que sepa pintarlos.
   -------------------------------------------------------------------------- */
const TIPOS_RESPUESTA = {
  encabezado:{ l:'Encabezado / sección',  ico:'§',  opciones:false },
  texto:    { l:'Texto',              ico:'📝', opciones:false },
  numero:   { l:'Número',             ico:'#',  opciones:false },
  sino:     { l:'Sí / No',            ico:'✓',  opciones:false },
  unica:    { l:'Selección única',    ico:'◉',  opciones:true  },
  multiple: { l:'Selección múltiple', ico:'☑',  opciones:true  },
  fecha:    { l:'Fecha',              ico:'📅', opciones:false },
  hora:     { l:'Hora',               ico:'🕐', opciones:false },
  archivo:  { l:'Archivo / imagen',   ico:'📎', opciones:false }
};

/** Valores activos de una lista. Cae en los de fábrica si está vacía. */
function lista(tipo){
  const propios = (S.listas || [])
    .filter(x => x.tipo === tipo && x.activo !== false)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map(x => x.valor);
  return propios.length ? propios : (LISTAS[tipo]?.def || []);
}

/** ¿Esta lista está personalizada o sigue con los valores de fábrica? */
const listaPersonalizada = tipo => (S.listas || []).some(x => x.tipo === tipo);

/**
 * Copia los valores de fábrica a la tabla, para poder editarlos.
 * Se llama solo la primera vez que tocas una lista en Configuración.
 */
async function materializarLista(tipo){
  if(listaPersonalizada(tipo)) return;
  const def = LISTAS[tipo]?.def || [];
  for(let i = 0; i < def.length; i++)
    await db.insert('listas', { tipo, valor: def[i], orden: i + 1, activo: true });
}

/* ---- Estados del pago ----------------------------------------------------
   Fijos a propósito: la app razona sobre ellos (alertas, filtros, cierre),
   así que no se pueden inventar valores nuevos sin romper esa lógica.
   -------------------------------------------------------------------------- */
const ESTADOS_PAGO = {
  pendiente_consignacion: { l:'Pendiente consignación', c:'d', ico:'💸',
    ayuda:'Ya lo registraste pero todavía no sale la plata.' },
  pendiente_factura:      { l:'Pendiente factura',      c:'w', ico:'🧾',
    ayuda:'Ya se pagó, falta que entreguen la factura o cuenta de cobro.' },
  finalizado:             { l:'Finalizado',             c:'o', ico:'✅',
    ayuda:'Pagado y con todos los soportes.' }
};

const ESTADOS_LEGALIZACION = {
  no: { l:'Sin pasar',  c:'n', ayuda:'Aún no la subiste a la automatización.' },
  si: { l:'Legalizado', c:'o', ayuda:'Ya la pasaste a la automatización.' }
};
