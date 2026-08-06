/* ============================================================================
   UTILIDADES — helpers puros, sin estado
   ========================================================================== */

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/** Escapa HTML. Úsalo SIEMPRE que insertes texto del usuario en una plantilla. */
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---- Dinero -------------------------------------------------------------- */
const cop = n => '$ ' + Math.round(n || 0).toLocaleString('es-CO');

/* ---- Fechas -------------------------------------------------------------- */
const hoyISO = () => new Date().toISOString().slice(0, 10);
const dISO   = d => d.toISOString().slice(0, 10);
const masDias = n => dISO(new Date(Date.now() + n * 86400000));

/** Días entre hoy y una fecha ISO. Negativo = ya pasó. */
function diasDesde(iso){
  const ms = new Date(iso + 'T00:00:00') - new Date(hoyISO() + 'T00:00:00');
  return Math.round(ms / 86400000);
}

/** "Hoy", "Mañana", "Hace 3 d", "12 ago" — lenguaje humano, no fechas frías. */
function fechaTxt(iso){
  if(!iso) return '';
  const d = diasDesde(iso);
  if(d ===  0) return 'Hoy';
  if(d ===  1) return 'Mañana';
  if(d === -1) return 'Ayer';
  if(d  <   0) return `Hace ${-d} d`;
  if(d  <   7) return `En ${d} d`;
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {day:'numeric', month:'short'});
}

/* ---- Feedback ------------------------------------------------------------ */
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---- Varios -------------------------------------------------------------- */
const uid = () => (crypto.randomUUID ? crypto.randomUUID()
                                     : 'id-' + Math.random().toString(36).slice(2, 11));
const suma = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const pct  = (parte, total) => total ? parte / total : 0;
