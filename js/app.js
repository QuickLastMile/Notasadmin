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
  { id:'caja',      ico:'▤', lbl:'Caja menor',  lblCorto:'Caja',
    vista:m => vCaja(m), badge:m => m.arqueo.sinLegalizar.length },
  { id:'proyectos', ico:'▣', lbl:'Proyectos',   vista:m => vProyectos(m) },
  { id:'clientes',  ico:'◍', lbl:'Clientes',    vista:m => vClientes(m) },
  { sec:'Recursos' },
  { id:'enlaces',   ico:'◈', lbl:'Dashboards',  vista:m => vEnlaces(m) }
];

/* En celular solo caben cuatro: el resto vive en la hoja "Más". */
const TABBAR = ['inicio', 'tareas', 'caja', 'novedades'];
const modulo = id => MENU.find(i => i.id === id);

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
      <span class="ico">⋯</span>Más
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
      <span class="ico">${oscuro ? '☀️' : '🌙'}</span>Tema ${oscuro ? 'claro' : 'oscuro'}</button>
    ${NUBE
      ? `<button class="sheet-item" onclick="salir()">
           <span class="ico">⎋</span>Salir${usuario?.email ? ` · ${esc(usuario.email)}` : ''}</button>`
      : `<button class="sheet-item" onclick="cargarEjemplo();cerrarSheet()">
           <span class="ico">◔</span>Datos de ejemplo</button>
         <button class="sheet-item" onclick="vaciarTodo();cerrarSheet()">
           <span class="ico">🗑</span>Vaciar todo</button>`}
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
    if(e.key === 'Escape'){ closeModal(); cerrarSheet(); }
  });
}

/* ---- Pie de la barra lateral: cambia según el modo ------------------------ */
function renderPieLateral(){
  const pie = $('.side-foot');
  if(!pie) return;

  if(NUBE){
    pie.innerHTML = `
      <button onclick="toggleTheme()" id="themeBtn">🌙 Tema</button>
      <button onclick="salir()" title="${esc(usuario?.email || '')}">⎋ Salir</button>`;
  }
  // En modo local se quedan los botones de Ejemplo y Vaciar que trae el HTML
}

/* ---- Arranque ------------------------------------------------------------ */
async function iniciar(){
  initTema();
  initFecha();
  initAtajos();

  if(NUBE){
    // Sin sesión no hay datos que mostrar: primero el acceso por correo
    if(!await sesionActual()){ mostrarLogin(); return; }
    // cargarNube devuelve false si faltan tablas: ya pintó su propia pantalla
    if(!await cargarNube()) return;
  } else {
    load();
  }

  renderPieLateral();
  render();
}

iniciar();
