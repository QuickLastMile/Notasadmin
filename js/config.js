/* ============================================================================
   CONFIG — parámetros de la app en un solo lugar
   ========================================================================== */

const CFG = {
  // Clave de almacenamiento local (súbela de versión si cambias el modelo de datos)
  storageKey: 'hub_personal_v2',
  themeKey:   'hub_theme',

  // Caja menor
  topeAlertaCaja: 0.75,   // avisa cuando hayas gastado este % de la base

  // Supabase. La anon key es pública por diseño: quien protege los datos es
  // el RLS del esquema (auth.uid() = user_id), no el secreto de esta llave.
  // La clave service_role NUNCA va aquí — salta el RLS.
  supabase: {
    url:     'https://jxfyiqisrnexjocqwicx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZnlpcWlzcm5leGpvY3F3aWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzQ0NjIsImV4cCI6MjEwMTk1MDQ2Mn0.odI73fI-lS1hjiNwA4lF3-EmH2KcfVZukyiXX6jfn38'
  }
};

/* Abrir con ?local=1 fuerza el modo localStorage aunque haya credenciales.
   Sirve para probar el diseño o mostrar la app sin tener que iniciar sesión.
   No expone nada: solo usa el almacenamiento de ese navegador. */
if(location.search.includes('local=1')){
  CFG.supabase = { url:'', anonKey:'' };
  CFG.storageKey += '_demo';
}

/* ---- Integraciones -------------------------------------------------------
   El bot de WhatsApp al que se le pasan las facturas para legalizar.
   Se guarda por dispositivo para poder cambiarlo sin tocar código.
   -------------------------------------------------------------------------- */
const BOT_POR_DEFECTO = '573102064803';   // +57 310 206 4803

const botWhatsapp = () => localStorage.getItem('hub_bot_wa') || BOT_POR_DEFECTO;

/** Deja solo dígitos y antepone el indicativo de Colombia si falta. */
function normalizarWhatsapp(numero){
  const d = String(numero || '').replace(/\D/g, '');
  if(!d) return '';
  if(d.startsWith('57')) return d;
  if(d.length === 10)    return '57' + d;    // celular colombiano suelto
  return d;
}

/** "+57 310 206 4803" — legible, para mostrar. */
function whatsappLegible(numero){
  const d = normalizarWhatsapp(numero);
  if(d.length !== 12) return '+' + d;
  return `+${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`;
}

const enlaceBot = (texto = '') =>
  `https://wa.me/${botWhatsapp()}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;

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
