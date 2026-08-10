/* ============================================================================
   CONFIG — parámetros de la app en un solo lugar
   ========================================================================== */

const CFG = {
  // Clave de almacenamiento local (súbela de versión si cambias el modelo de datos)
  storageKey: 'hub_personal_v2',
  themeKey:   'hub_theme',

  // Caja menor
  topeAlertaCaja: 0.75,   // avisa cuando hayas gastado este % de la base

  // Supabase — se llena cuando conectemos la nube
  supabase: {
    url:     '',          // https://xxxxx.supabase.co
    anonKey: ''           // clave anónima (pública: la seguridad la da RLS)
  }
};

/* Etiquetas compartidas ---------------------------------------------------- */
const PRI = {
  alta:  { l:'Alta',  c:'d' },
  media: { l:'Media', c:'w' },
  baja:  { l:'Baja',  c:'n' }
};

const EST_PROYECTO = {
  propuesta: { l:'Propuesta', c:'n' },
  en_curso:  { l:'En curso',  c:'b' },
  en_riesgo: { l:'En riesgo', c:'d' },
  hecho:     { l:'Entregado', c:'o' }
};

/* ---- Caja menor ---------------------------------------------------------- */
const CATEGORIAS_CAJA = [
  'Pago mensajero','Parqueadero','Combustible','Transporte',
  'Peajes','Alimentación','Papelería','Insumos','Servicios','Base','Otros'
];

const METODOS_PAGO = ['Transferencia','Nequi','Daviplata','Efectivo','Bancolombia a la mano'];

const TIPOS_DOC = ['CC','NIT','CE','PPT'];

const BANCOS = [
  'Bancolombia','Davivienda','Nequi','Daviplata','BBVA','Banco de Bogotá',
  'Banco Agrario','Colpatria','AV Villas','Falabella','Efectivo','Otro'
];

const TIPOS_CUENTA = ['Ahorros','Corriente','Depósito electrónico'];
