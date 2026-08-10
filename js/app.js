/* ============================================================================
   APP — menú, enrutado y arranque
   ========================================================================== */

let vista = 'inicio';

/* El menú lateral. Agregar un módulo = una línea aquí + su archivo en views/. */
const MENU = [
  { sec:'Diario' },
  { id:'inicio',    ico:ICO.inicio,    lbl:'Inicio',      vista:m => vInicio(m) },
  { id:'tareas',    ico:ICO.tareas,    lbl:'Tareas',      vista:m => vTareas(m),    badge:m => m.vencidas.length },
  { id:'novedades', ico:ICO.novedades, lbl:'Novedades',   vista:m => vNovedades(m), badge:m => m.novCriticas.length },
  { sec:'Gestión' },
  { id:'caja',      ico:ICO.caja,      lbl:'Caja menor',  lblCorto:'Caja',
    vista:m => vCaja(m), badge:m => m.arqueo.sinLegalizar.length },
  { id:'proyectos', ico:ICO.proyectos, lbl:'Proyectos',   vista:m => vProyectos(m) },
  { id:'clientes',  ico:ICO.clientes,  lbl:'Clientes',    vista:m => vClientes(m) },
  { sec:'Recursos' },
  { id:'enlaces',   ico:ICO.enlaces,   lbl:'Dashboards',  vista:m => vEnlaces(m) },
  { id:'config',    ico:ICO.config,    lbl:'Configuración', vista:m => vConfig(m) }
];

/* En celular solo caben cuatro: el resto vive en la hoja "Más". */
const TABBAR = ['inicio', 'tareas', 'caja', 'novedades'];
const modulo = id => MENU.find(i => i.id === id);

function renderNav(m){
  $('#nav').innerHTML = MENU.map(i => {
    if(i.sec) return `<div class="nav-lbl">${i.sec}</div>`;
    const b = i.badge ? i.badge(m) : 0;
    return `
      <button class="nav-item ${vista === i.id ? 'active' : ''}" onclick="go('${i.id}')"
              title="${i.lbl}">
        <span class="ico">${i.ico}</span><span class="lbl">${i.lbl}</span>
        ${b ? `<span class="badge">${b}</span>` : ''}
      </button>`;
  }).join('');

  renderTabbar(m);
}

/* ---- Barra inferior (celular) -------------------------------------------- */
function renderTabbar(m){
  const enMas = !TABBAR.includes(vista);

  const botones = TABBAR.map(id => {
    const i = modulo(id);
    const b = i.badge ? i.badge(m) : 0;
    return `
      <button class="${vista === id ? 'active' : ''}" onclick="go('${id}')">
        <span class="ico">${i.ico}</span>${i.lblCorto || i.lbl}
        ${b ? `<span class="badge">${b > 9 ? '9+' : b}</span>` : ''}
      </button>`;
  }).join('');

  $('#tabbar').innerHTML = botones + `
    <button class="${enMas ? 'active' : ''}" onclick="abrirMas()">
      <span class="ico">${ICO.mas}</span>Más
    </button>`;
}

/* ---- Hoja inferior "Más" -------------------------------------------------- */
function abrirMas(){
  const m = metricas();
  const restantes = MENU.filter(i => i.id && !TABBAR.includes(i.id));

  const item = i => {
    const b = i.badge ? i.badge(m) : 0;
    return `<button class="sheet-item" onclick="go('${i.id}');cerrarSheet()">
      <span class="ico">${i.ico}</span>${i.lbl}
      ${b ? `<span class="badge">${b}</span>` : ''}
    </button>`;
  };

  const oscuro = document.documentElement.getAttribute('data-theme') === 'dark';

  $('#sheet').innerHTML = `
    <div class="sheet-grip"></div>
    ${restantes.map(item).join('')}
    <div class="sheet-sep"></div>
    <button class="sheet-item" onclick="toggleTheme()">
      <span class="ico">${ICO.apariencia}</span>Tema ${oscuro ? 'claro' : 'oscuro'}</button>
    ${NUBE
      ? `<button class="sheet-item" onclick="salir()">
           <span class="ico">${ICO.escudo}</span>Salir${usuario?.email ? ` · ${esc(usuario.email)}` : ''}</button>`
      : `<button class="sheet-item" onclick="cargarEjemplo();cerrarSheet()">
           <span class="ico">${ICO.listados}</span>Datos de ejemplo</button>
         <button class="sheet-item" onclick="vaciarTodo();cerrarSheet()">
           <span class="ico">${ICO.historial}</span>Vaciar todo</button>`}
  `;
  $('#sheetMask').classList.add('on');
  requestAnimationFrame(() => $('#sheet').classList.add('on'));
}

function cerrarSheet(){
  $('#sheet').classList.remove('on');
  $('#sheetMask').classList.remove('on');
}

function go(v){
  vista = v;
  cerrarSheet();
  render();
  window.scrollTo(0, 0);
}

function render(){
  const m = metricas();
  renderNav(m);
  const item = modulo(vista) || MENU[1];
  $('#view').innerHTML = item.vista(m);
}

/* ---- Tema, acento y densidad --------------------------------------------- */
function aplicarTema(t){
  document.documentElement.setAttribute('data-theme', t);
}
function toggleTheme(){
  const nuevo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(CFG.themeKey, nuevo);
  aplicarTema(nuevo);
  renderPieLateral();
}
function initTema(){
  aplicarTema(localStorage.getItem(CFG.themeKey)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  aplicarAcento();
  document.documentElement.setAttribute('data-densidad',
    localStorage.getItem('hub_densidad') || 'normal');
  const tope = localStorage.getItem('hub_tope_caja');
  if(tope) CFG.topeAlertaCaja = +tope;
}

/** El color de acento se sobrescribe encima de los tokens del tema. */
function aplicarAcento(){
  const hex = localStorage.getItem('hub_acento');
  const r = document.documentElement.style;
  if(!hex){ r.removeProperty('--brand'); r.removeProperty('--brand-2'); r.removeProperty('--brand-3'); return; }
  r.setProperty('--brand', hex);
  r.setProperty('--brand-2', mezclar(hex, '#000', .22));
  r.setProperty('--brand-3', mezclar(hex, '#fff', .18));
}

/** Mezcla dos colores hex. Sirve para derivar el tono de hover del acento. */
function mezclar(a, b, t){
  const n = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [r1,g1,b1] = n(a), [r2,g2,b2] = n(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1,r2)}${m(g1,g2)}${m(b1,b2)}`;
}

/* ---- Barra lateral contraíble -------------------------------------------- */
function aplicarBarra(){
  const mini = localStorage.getItem('hub_barra') === 'mini';
  document.getElementById('app').classList.toggle('mini', mini);
  const b = $('#sideToggle');
  if(b){
    b.innerHTML = mini ? ICO.desplegar : ICO.plegar;
    b.title = mini ? 'Expandir barra lateral' : 'Contraer barra lateral';
  }
}
function toggleBarra(){
  const mini = localStorage.getItem('hub_barra') === 'mini';
  localStorage.setItem('hub_barra', mini ? 'full' : 'mini');
  aplicarBarra();
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
    if(e.key === 'Escape'){ closeModal(); cerrarSheet(); cerrarDrawer(); }
  });
}

/* ---- Pie de la barra lateral --------------------------------------------- */
function renderPieLateral(){
  const oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
  $('#sideFoot').innerHTML = `
    <button onclick="toggleTheme()" title="Cambiar tema">
      <span class="ico">${ICO.apariencia}</span><span class="lbl">${oscuro ? 'Claro' : 'Oscuro'}</span></button>
    ${NUBE
      ? `<button onclick="salir()" title="Salir · ${esc(usuario?.email || '')}">
           <span class="ico">${ICO.escudo}</span><span class="lbl">Salir</span></button>`
      : `<button onclick="irConfig('prefs');go('config')" title="Preferencias">
           <span class="ico">${ICO.ajustes}</span><span class="lbl">Datos</span></button>`}`;
}

/* ---- Arranque ------------------------------------------------------------ */
function quitarSplash(){
  const s = document.getElementById('splash');
  const a = document.getElementById('app');
  if(a) a.hidden = false;
  if(s){ s.classList.add('fuera'); setTimeout(() => s.remove(), 320); }
}

async function iniciar(){
  initTema();
  $('#brandLogo').innerHTML = logoNexa(32, 'side');

  if(NUBE){
    const sesion = await sesionActual();

    // Al volver del enlace de recuperación hay sesión, pero lo que toca
    // es cambiar la contraseña, no entrar directo
    if(location.hash.includes('recuperar') || location.hash.includes('type=recovery')){
      quitarSplash(); mostrarNuevaPassword(); return;
    }
    if(!sesion){ quitarSplash(); mostrarLogin(); return; }

    // cargarNube devuelve false si faltan tablas: ya pintó su propia pantalla
    if(!await cargarNube()){ quitarSplash(); return; }
  } else {
    load();
  }

  initFecha();
  initAtajos();
  aplicarBarra();
  renderPieLateral();
  render();
  quitarSplash();
}

iniciar();
