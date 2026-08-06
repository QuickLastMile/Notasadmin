/* ============================================================================
   APP — menú, enrutado y arranque
   ========================================================================== */

let vista = 'inicio';

/* El menú lateral. Agregar un módulo = una línea aquí + su archivo en views/. */
const MENU = [
  { sec:'Diario' },
  { id:'inicio',    ico:'◉', lbl:'Inicio',      vista:m => vInicio(m) },
  { id:'tareas',    ico:'✓', lbl:'Tareas',      vista:m => vTareas(m),    badge:m => m.vencidas.length },
  { id:'novedades', ico:'⚠', lbl:'Novedades',   vista:m => vNovedades(m), badge:m => m.novCriticas.length },
  { sec:'Gestión' },
  { id:'caja',      ico:'▤', lbl:'Caja menor',  vista:m => vCaja(m),      badge:m => m.sinLegalizar.length },
  { id:'proyectos', ico:'▣', lbl:'Proyectos',   vista:m => vProyectos(m) },
  { id:'clientes',  ico:'◍', lbl:'Clientes',    vista:m => vClientes(m) },
  { sec:'Recursos' },
  { id:'enlaces',   ico:'◈', lbl:'Dashboards',  vista:m => vEnlaces(m) }
];

function renderNav(m){
  $('#nav').innerHTML = MENU.map(i => {
    if(i.sec) return `<div class="nav-lbl">${i.sec}</div>`;
    const b = i.badge ? i.badge(m) : 0;
    return `
      <button class="nav-item ${vista === i.id ? 'active' : ''}" onclick="go('${i.id}')">
        <span class="ico">${i.ico}</span>${i.lbl}
        ${b ? `<span class="badge">${b}</span>` : ''}
      </button>`;
  }).join('');
}

function go(v){
  vista = v;
  $('#side').classList.remove('open');
  render();
  window.scrollTo(0, 0);
}

function render(){
  const m = metricas();
  renderNav(m);
  const item = MENU.find(i => i.id === vista) || MENU[1];
  $('#view').innerHTML = item.vista(m);
}

/* ---- Tema ---------------------------------------------------------------- */
function aplicarTema(t){
  document.documentElement.setAttribute('data-theme', t);
  $('#themeBtn').textContent = t === 'dark' ? '☀️ Tema' : '🌙 Tema';
}
function toggleTheme(){
  const nuevo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(CFG.themeKey, nuevo);
  aplicarTema(nuevo);
}
function initTema(){
  aplicarTema(localStorage.getItem(CFG.themeKey)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}

/* ---- Fecha de cabecera --------------------------------------------------- */
function initFecha(){
  const d = new Date();
  $('#hoyTxt').textContent = d
    .toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })
    .replace(/^\w/, c => c.toUpperCase());
  $('#hoySub').textContent = d.getFullYear();
}

/* ---- Atajos de teclado --------------------------------------------------- */
function initAtajos(){
  const cap = $('#cap');

  cap.addEventListener('input', previewCap);
  cap.addEventListener('keydown', e => {
    if(e.key === 'Enter') commitCap();
    if(e.key === 'Escape'){ e.target.value = ''; $('#prev').classList.remove('on'); e.target.blur(); }
  });

  document.addEventListener('keydown', e => {
    const escribiendo = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if(e.key === '/' && !escribiendo){ e.preventDefault(); cap.focus(); }
    if(e.key === 'Escape') closeModal();
  });
}

/* ---- Arranque ------------------------------------------------------------ */
load();
initTema();
initFecha();
initAtajos();
render();
