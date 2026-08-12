/* ============================================================================
   VISTA: CONFIGURACIÓN — panel de administración
   ----------------------------------------------------------------------------
   Dos columnas: menú de secciones a la izquierda, contenido a la derecha.
   La información va en filas y tablas ligeras, no en tarjetas.
   ========================================================================== */

let cfgSeccion = 'preguntas';
let cfgBuscar  = '';
let cfgFiltro  = 'todas';
let listaAbierta = null;

const CFG_MENU = [
  { grupo:'Contenido' },
  { id:'preguntas', ico:ICO.preguntas, lbl:'Preguntas' },
  { id:'listados',  ico:ICO.listados,  lbl:'Listados' },
  { id:'categorias',ico:ICO.etiquetas, lbl:'Categorías' },
  { id:'campos',    ico:ICO.campos,    lbl:'Campos personalizados' },

  { grupo:'Gestión' },
  { id:'proyectos', ico:ICO.proyectos, lbl:'Proyectos' },
  { id:'clientes',  ico:ICO.clientes,  lbl:'Clientes' },
  { id:'usuarios',  ico:ICO.usuarios,  lbl:'Usuarios' },
  { id:'permisos',  ico:ICO.escudo,    lbl:'Roles y permisos' },

  { grupo:'Aplicación' },
  { id:'apariencia',ico:ICO.apariencia,lbl:'Apariencia' },
  { id:'notif',     ico:ICO.campana,   lbl:'Notificaciones' },
  { id:'prefs',     ico:ICO.ajustes,   lbl:'Preferencias' },

  { grupo:'Sistema' },
  { id:'integraciones', ico:ICO.enchufe,   lbl:'Integraciones' },
  { id:'automatiz',     ico:ICO.rayo,      lbl:'Automatizaciones' },
  { id:'actividad',     ico:ICO.historial, lbl:'Registro de actividad' }
];

function irConfig(id){ cfgSeccion = id; cfgBuscar = ''; cfgFiltro = 'todas'; render(); }

/* ========================================================================== */
function vConfig(){
  const actual = CFG_MENU.find(i => i.id === cfgSeccion);

  return `
  <div class="cfg">
    <!-- Menú de secciones -->
    <nav class="cfg-nav">
      <div class="cfg-nav-tit">Configuración</div>
      ${CFG_MENU.map(i => i.grupo
        ? `<div class="cfg-grupo">${i.grupo}</div>`
        : `<button class="cfg-item ${cfgSeccion === i.id ? 'active' : ''}" onclick="irConfig('${i.id}')">
             <span class="cfg-ico">${i.ico}</span>${i.lbl}</button>`
      ).join('')}
    </nav>

    <!-- Contenido -->
    <section class="cfg-panel">
      <nav class="cfg-movil" aria-label="Secciones de configuración">
        ${CFG_MENU.filter(i => i.id).map(i =>
          `<button class="${cfgSeccion === i.id ? 'active' : ''}" onclick="irConfig('${i.id}')">
            <span>${i.ico}</span>${i.lbl}</button>`).join('')}
      </nav>
      ${(SECCIONES[cfgSeccion] || (() => cfgPendiente(actual)))()}
    </section>
  </div>`;
}

/* ---- Piezas compartidas --------------------------------------------------- */

const cfgHead = (titulo, sub, accion = '') => `
  <div class="cfg-head">
    <div><h1>${esc(titulo)}</h1><p>${esc(sub)}</p></div>
    ${accion}
  </div>`;

const cfgBarra = (placeholder, filtros = []) => `
  <div class="cfg-barra">
    <div class="cfg-buscar">
      <span>${ICO.buscar}</span>
      <input value="${esc(cfgBuscar)}" placeholder="${esc(placeholder)}"
             oninput="cfgBuscar=this.value;repintarPanel()">
    </div>
    ${filtros.length ? `<select onchange="cfgFiltro=this.value;repintarPanel()">
      ${filtros.map(([v, l]) =>
        `<option value="${v}" ${cfgFiltro === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}
    </select>` : ''}
  </div>`;

/** Repinta solo el panel derecho, para no perder el foco del buscador. */
function repintarPanel(){
  const panel = document.querySelector('.cfg-panel');
  if(!panel) return render();
  const foco = document.activeElement;
  const pos  = foco?.selectionStart;
  panel.innerHTML = (SECCIONES[cfgSeccion] || (() => cfgPendiente()))();
  if(foco?.closest?.('.cfg-buscar')){
    const nuevo = panel.querySelector('.cfg-buscar input');
    nuevo?.focus();
    if(pos != null) nuevo?.setSelectionRange(pos, pos);
  }
}

const cfgVacio = (titulo, sub, boton = '') => `
  <div class="cfg-vacio">
    <div class="cfg-vacio-ico">${ICO.buscar}</div>
    <strong>${esc(titulo)}</strong>
    <p>${esc(sub)}</p>
    ${boton}
  </div>`;

/** Sección todavía sin implementar: se dice qué hará, no se finge. */
function cfgPendiente(item){
  const it = item || CFG_MENU.find(i => i.id === cfgSeccion) || {};
  const explica = {
    campos:'Definir campos propios (texto, número, lista…) para agregarlos a proyectos, clientes o movimientos de caja sin tocar código.',
    notif:'Elegir de qué te avisa la app y por dónde: pagos por legalizar, topes de presupuesto, tareas vencidas.',
    automatiz:'Reglas del tipo "si un pago lleva 5 días sin factura, créame una tarea". Automatizar lo que hoy persigues a mano.',
    actividad:'Historial de quién cambió qué y cuándo. Requiere registrar cada movimiento en la base de datos.'
  }[it.id] || '';

  return `
    ${cfgHead(it.lbl || 'Sección', 'Todavía no está disponible.')}
    <div class="cfg-pendiente">
      <span class="chip w">En construcción</span>
      <p>${esc(explica)}</p>
      <small>Está en el menú para que sepas hacia dónde va la app, pero aún no hace nada.
        Prefiero decírtelo así antes que mostrarte una pantalla que parece funcionar y no funciona.</small>
    </div>`;
}

/* ============================================================================
   SECCIONES
   ========================================================================== */
const SECCIONES = {

/* ---- Notificaciones ----------------------------------------------------- */
notif(){
  const p=notifPrefs(), permiso=!('Notification' in window)?'no_disponible':Notification.permission;
  const fila=(titulo,sub,clave)=>`<div class="cfg-fila"><div class="cfg-fila-txt"><strong>${titulo}</strong><small>${sub}</small></div>
    <button class="switch ${p[clave]!==false?'on':''}" onclick="cambiarPreferenciaNotif('${clave}',${p[clave]===false})" aria-label="${titulo}"></button></div>`;
  return `${cfgHead('Notificaciones','Elige qué necesita seguimiento y cómo quieres recibirlo.',
    `<button class="btn" onclick="go('notificaciones')">Ver centro de avisos</button>`)}
    <div class="cfg-tit-sec">Avisos del navegador</div>
    <div class="cfg-lista"><div class="cfg-fila"><div class="cfg-fila-txt"><strong>Permiso del navegador</strong>
      <small>${permiso==='granted'?'Autorizado en este dispositivo':permiso==='denied'?'Bloqueado en la configuración del navegador':'Todavía no autorizado'}</small></div>
      <span class="chip ${permiso==='granted'?'o':permiso==='denied'?'d':'w'}">${permiso==='granted'?'Activo':permiso==='denied'?'Bloqueado':'Pendiente'}</span>
      ${permiso!=='granted'?`<button class="btn pri" onclick="permisoNotificaciones()">Activar</button>`:`<button class="btn" onclick="probarNotificacion()">Enviar prueba</button>`}</div></div>
    <div class="cfg-nota"><p>El aviso aparece cuando NEXA está abierta o instalada y activa. Para garantizar envíos con el navegador completamente cerrado se necesitará un servicio programado; podrá conectarse después con Telegram.</p></div>
    <div class="cfg-tit-sec">Qué debe avisarme</div><div class="cfg-lista">
      ${fila('Tareas','Vencidas, para hoy y seguimientos atrasados.','tareas')}
      ${fila('Proyectos','En riesgo o próximos a su fecha de entrega.','proyectos')}
      ${fila('Caja menor','Movimientos sin legalizar y saldo bajo.','caja')}
      ${fila('Formularios','Respuestas recibidas durante las últimas 24 horas.','formularios')}
      ${fila('Novedades','Novedades críticas todavía abiertas.','novedades')}
      ${fila('Calendario','Fechas y eventos dentro de su ventana de aviso.','calendario')}
    </div>
    <div class="cfg-tit-sec">Anticipación para proyectos</div><div class="cfg-lista"><div class="cfg-fila">
      <div class="cfg-fila-txt"><strong>Avisar antes del vencimiento</strong><small>Se aplica a proyectos activos con fecha de entrega.</small></div>
      <select onchange="cambiarPreferenciaNotif('anticipacion',+this.value)">${[1,2,3,5,7,15].map(d=>`<option value="${d}" ${+p.anticipacion===d?'selected':''}>${d} día${d===1?'':'s'} antes</option>`).join('')}</select></div></div>`;
},

/* ---- Campos personalizados ---------------------------------------------- */
campos(){
  const q = cfgBuscar.toLowerCase();
  const campos = (S.campos_personalizados || [])
    .filter(c => !q || c.nombre.toLowerCase().includes(q) || (c.descripcion || '').toLowerCase().includes(q))
    .sort((a,b) => (a.orden || 0) - (b.orden || 0));
  const tipos = { texto:'Texto', numero:'Número', fecha:'Fecha', seleccion:'Selección', booleano:'Sí / No' };
  return `
    ${cfgHead('Campos personalizados', 'Agrega información propia a todos tus proyectos sin modificar el código.',
      `<button class="btn pri" onclick="modalCampoPersonalizado()">+ Nuevo campo</button>`)}
    ${cfgBarra('Buscar campos…')}
    ${campos.length ? `<div class="cfg-lista">${campos.map(c => `<div class="cfg-fila ${c.activo === false ? 'apagada' : ''}">
      <div class="cfg-fila-txt"><strong>${esc(c.nombre)}</strong><small>${tipos[c.tipo] || c.tipo} · Proyectos${c.obligatorio ? ' · obligatorio' : ''}${c.descripcion ? ` · ${esc(c.descripcion)}` : ''}</small></div>
      <span class="chip ${c.activo === false ? 'n' : 'o'}">${c.activo === false ? 'Inactivo' : 'Activo'}</span>
      ${menuAcciones([
        ['Editar', `modalCampoPersonalizado('${c.id}')`],
        [c.activo === false ? 'Activar' : 'Desactivar', `alternarCampoPersonalizado('${c.id}')`],
        ['Eliminar', `eliminarCampoPersonalizado('${c.id}')`, 'peligro']
      ])}</div>`).join('')}</div>` : cfgVacio('Aún no hay campos',
        'Crea datos adicionales como número de contrato, área, presupuesto o tipo de proyecto.',
        `<button class="btn pri" onclick="modalCampoPersonalizado()">+ Crear el primero</button>`)}`;
},

/* ---- Preguntas ----------------------------------------------------------- */
preguntas(){
  const filtro = {
    todas:   q => true,
    activas: q => q.activa !== false,
    inactivas: q => q.activa === false
  }[cfgFiltro] || (() => true);

  const q = cfgBuscar.toLowerCase();
  const lista = S.preguntas
    .filter(filtro)
    .filter(p => !q || p.texto.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q))
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return `
    ${cfgHead('Preguntas', 'Administra las preguntas que usan tus formularios.',
      `<button class="btn pri" onclick="modalPregunta()">+ Nueva pregunta</button>`)}

    ${cfgBarra('Buscar preguntas…', [
      ['todas', `Todas (${S.preguntas.length})`],
      ['activas', `Activas (${S.preguntas.filter(x => x.activa !== false).length})`],
      ['inactivas', `Inactivas (${S.preguntas.filter(x => x.activa === false).length})`]
    ])}

    ${lista.length ? `<div class="cfg-lista">${lista.map(filaPregunta).join('')}</div>`
      : S.preguntas.length
        ? cfgVacio('Sin resultados', 'Ninguna pregunta coincide con la búsqueda.')
        : cfgVacio('Aún no hay preguntas',
            'Las preguntas alimentan los formularios que llenan tus mensajeros y coordinadores.',
            `<button class="btn pri" onclick="modalPregunta()">+ Crear la primera</button>`)}`;
},

/* ---- Listados ------------------------------------------------------------ */
listados(){
  const q = cfgBuscar.toLowerCase();
  const tipos = Object.entries(LISTAS)
    .filter(([t, d]) => t !== 'categoria')
    .filter(([t, d]) => !q || d.nombre.toLowerCase().includes(q) ||
                        lista(t).some(v => v.toLowerCase().includes(q)));

  return `
    ${cfgHead('Listados', 'Las opciones que salen en cada desplegable de la aplicación.')}
    ${cfgBarra('Buscar listados u opciones…')}
    ${tipos.length ? `<div class="cfg-lista">${tipos.map(([t, d]) => filaListado(t, d)).join('')}</div>`
      : cfgVacio('Sin resultados', 'Ningún listado coincide con la búsqueda.')}`;
},

/* ---- Categorías ---------------------------------------------------------- */
categorias(){
  const q = cfgBuscar.toLowerCase();
  const cats = lista('categoria').filter(c => !q || c.toLowerCase().includes(q));

  return `
    ${cfgHead('Categorías', 'Agrupan preguntas y campos personalizados.')}
    ${cfgBarra('Buscar categorías…')}

    <div class="cfg-alta">
      <input id="nuevaCat" placeholder="Nombre de la categoría…"
             onkeydown="if(event.key==='Enter')agregarALista('categoria','nuevaCat')">
      <button class="btn pri" onclick="agregarALista('categoria','nuevaCat')">+ Agregar</button>
    </div>

    ${cats.length ? `<div class="cfg-lista">${cats.map(c => {
      const usos = S.preguntas.filter(p => p.categoria === c).length;
      return `<div class="cfg-fila">
        <div class="cfg-fila-txt">
          <strong>${esc(c)}</strong>
          <small>${usos ? `${usos} pregunta${usos > 1 ? 's' : ''}` : 'Sin uso todavía'}</small>
        </div>
        ${menuAcciones([['Eliminar', `quitarDeLista('categoria',${JSON.stringify(c).replace(/"/g,'&quot;')})`, 'peligro']])}
      </div>`;
    }).join('')}</div>` : cfgVacio('Sin categorías', 'Crea la primera arriba.')}`;
},

/* ---- Proyectos ----------------------------------------------------------- */
proyectos(){
  const q = cfgBuscar.toLowerCase();
  const lst = S.proyectos.filter(p => !q || p.nombre.toLowerCase().includes(q));

  return `
    ${cfgHead('Proyectos', 'Los entregables en curso y su estado.',
      `<button class="btn pri" onclick="modalProyecto()">+ Nuevo proyecto</button>`)}
    ${cfgBarra('Buscar proyectos…')}
    ${lst.length ? `<div class="cfg-lista">${lst.map(p => {
      const e = EST_PROYECTO[p.estado] || EST_PROYECTO.en_curso;
      return `<div class="cfg-fila">
        <span class="dot" style="background:${cli(p.cliente_id).color}"></span>
        <div class="cfg-fila-txt">
          <strong>${esc(p.nombre)}</strong>
          <small>${esc(cli(p.cliente_id).nombre)} · ${p.avance}% de avance
            ${p.vence ? ` · vence ${fechaTxt(p.vence)}` : ''}</small>
        </div>
        <span class="chip ${e.c}">${e.l}</span>
        ${menuAcciones([
          ['Eliminar', `confirmarPeligro('¿Eliminar este proyecto?',
            ${JSON.stringify(`"${p.nombre}"\n\nLas tareas asociadas quedarán sin proyecto. Esta acción no se puede deshacer.`)},
            async()=>{await db.remove('proyectos','${p.id}');render();toast('Proyecto eliminado')})`, 'peligro']
        ])}
      </div>`;
    }).join('')}</div>` : cfgVacio('Sin proyectos', 'Crea el primero para agrupar tareas.',
      `<button class="btn pri" onclick="modalProyecto()">+ Nuevo proyecto</button>`)}`;
},

/* ---- Clientes ------------------------------------------------------------ */
clientes(){
  const q = cfgBuscar.toLowerCase();
  const lst = S.clientes.filter(c => !q || c.nombre.toLowerCase().includes(q));

  return `
    ${cfgHead('Clientes', 'A quién se imputan tareas, pagos y novedades.',
      `<button class="btn pri" onclick="modalCliente()">+ Nuevo cliente</button>`)}
    ${cfgBarra('Buscar clientes…')}
    ${lst.length ? `<div class="cfg-lista">${lst.map(c => {
      const tk = S.tareas.filter(t => t.cliente_id === c.id).length;
      const gs = suma(S.caja.filter(g => g.tipo === 'gasto' && g.cliente_id === c.id), g => g.monto);
      return `<div class="cfg-fila">
        <span class="dot" style="background:${c.color}"></span>
        <div class="cfg-fila-txt">
          <strong>${esc(c.nombre)}</strong>
          <small>${esc(c.contacto || 'Sin contacto')} · ${tk} tareas · ${cop(gs)} en gastos</small>
        </div>
        ${menuAcciones([
          ['Eliminar', `confirmarPeligro('¿Eliminar este cliente?',
            ${JSON.stringify(`"${c.nombre}"\n\nSus tareas, pagos y novedades quedarán sin cliente. Esta acción no se puede deshacer.`)},
            async()=>{await db.remove('clientes','${c.id}');render();toast('Cliente eliminado')})`, 'peligro']
        ])}
      </div>`;
    }).join('')}</div>` : cfgVacio('Sin clientes', 'Todo lo demás se cuelga de un cliente.',
      `<button class="btn pri" onclick="modalCliente()">+ Nuevo cliente</button>`)}`;
},

/* ---- Usuarios ------------------------------------------------------------ */
usuarios(){
  // Si entró con Google, la cuenta puede no tener contraseña todavía
  const proveedores = usuario?.app_metadata?.providers
                   || (usuario?.app_metadata?.provider ? [usuario.app_metadata.provider] : []);
  const conGoogle   = proveedores.includes('google');
  const conPassword = proveedores.includes('email');

  return `
    ${cfgHead('Usuarios', 'Quién entra a la aplicación.')}

    <div class="cfg-lista">
      <div class="cfg-fila">
        <span class="dot" style="background:var(--brand)"></span>
        <div class="cfg-fila-txt">
          <strong>${esc(NUBE ? (usuario?.email || 'Tu cuenta') : 'Sesión local')}</strong>
          <small>${NUBE ? 'Dueña de estos datos' : 'Sin cuenta — los datos viven en este navegador'}</small>
        </div>
        <span class="chip b">Administradora</span>
      </div>

      ${NUBE ? `
      <div class="cfg-fila">
        <div class="cfg-fila-txt">
          <strong>Cómo entras</strong>
          <small>${proveedores.length
            ? proveedores.map(p => p === 'google' ? 'Google' : 'Correo y contraseña').join(' · ')
            : 'Correo y contraseña'}</small>
        </div>
        ${conGoogle ? '<span class="chip o">Google</span>' : ''}
        ${conPassword ? '<span class="chip n">Contraseña</span>' : ''}
      </div>

      <div class="cfg-fila">
        <div class="cfg-fila-txt">
          <strong>${conPassword ? 'Cambiar contraseña' : 'Crear una contraseña'}</strong>
          <small>${conPassword
            ? 'Para entrar desde otros dispositivos sin usar Google.'
            : 'Tu cuenta entra solo con Google, así que todavía no tiene contraseña. Créala aquí y podrás usar las dos formas.'}</small>
        </div>
        <button class="btn pri" onclick="modalPassword()">
          ${conPassword ? 'Cambiar' : 'Crear contraseña'}</button>
      </div>` : ''}
    </div>

    <div class="cfg-nota">
      <strong>Cada persona tiene su propio espacio</strong>
      <p>Hoy la aplicación es individual: quien cree una cuenta abre su propia caja,
      sus mensajeros y sus tareas. No ve nada de lo tuyo, y tú no ves lo suyo. Eso lo
      garantiza el RLS de la base de datos, no una pantalla.</p>
      <p>Para dar acceso a alguien, pásale el enlace de la aplicación y que cree su cuenta.</p>
      <p><strong>Si quieres compartir datos</strong> —que un mensajero suba él mismo la foto
      del parqueadero, por ejemplo— hay que construir espacios de trabajo con roles.
      Es un cambio de fondo en las políticas de las 12 tablas, no un botón. Se puede,
      pero se decide aparte.</p>
    </div>`;
},

/* ---- Roles y permisos ---------------------------------------------------- */
permisos(){
  return `
    ${cfgHead('Roles y permisos', 'Qué puede hacer cada quien.')}
    <div class="cfg-nota">
      <span class="chip w">Sin roles por ahora</span>
      <p>Como cada usuario tiene su propio espacio, no hay nada que repartir:
      dentro de tu espacio puedes todo, y fuera de él, nada.</p>
      <p>Los roles (administrador, quien registra, quien solo consulta) tienen sentido
      cuando varias personas comparten los mismos datos. Cuando decidas eso,
      esta pantalla se llena.</p>
    </div>`;
},

/* ---- Apariencia ---------------------------------------------------------- */
apariencia(){
  const oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
  const dens   = localStorage.getItem('hub_densidad') || 'normal';
  const acento = localStorage.getItem('hub_acento') || '';

  const fila = (titulo, sub, control) => `
    <div class="cfg-fila">
      <div class="cfg-fila-txt"><strong>${esc(titulo)}</strong><small>${esc(sub)}</small></div>
      ${control}
    </div>`;

  // Todos salen de la paleta de la marca: nada de morados
  const ACENTOS = [
    ['',        'Granate',   '#800000'],
    ['#633A2C', 'Cacao',     '#633A2C'],
    ['#9E3226', 'Terracota', '#9E3226'],
    ['#B8860B', 'Oro viejo', '#B8860B'],
    ['#4A5D4E', 'Salvia',    '#4A5D4E']
  ];

  return `
    ${cfgHead('Apariencia', 'Cómo se ve la aplicación en este dispositivo.')}

    <div class="cfg-lista">
      ${fila('Tema', 'Claro u oscuro. Por defecto sigue al sistema.',
        `<div class="seg">
          <button class="${!oscuro ? 'on' : ''}" onclick="fijarTema('light')">Claro</button>
          <button class="${oscuro ? 'on' : ''}" onclick="fijarTema('dark')">Oscuro</button>
        </div>`)}

      ${fila('Color principal', 'El acento de botones, menús y enlaces.',
        `<div class="colores">
          ${ACENTOS.map(([v, l, c]) =>
            `<button class="color ${acento === v ? 'on' : ''}" style="background:${c}"
                     title="${l}" onclick="fijarAcento('${v}')"></button>`).join('')}
        </div>`)}

      ${fila('Densidad', 'Cuánto aire entre los elementos.',
        `<div class="seg">
          ${[['compacta','Compacta'],['normal','Normal'],['amplia','Amplia']].map(([v, l]) =>
            `<button class="${dens === v ? 'on' : ''}" onclick="fijarDensidad('${v}')">${l}</button>`).join('')}
        </div>`)}

      ${fila('Barra lateral contraída', 'Deja solo los iconos y gana espacio.',
        `<button class="switch ${localStorage.getItem('hub_barra') === 'mini' ? 'on' : ''}"
                 onclick="toggleBarra();repintarPanel()" aria-label="Contraer barra"></button>`)}
    </div>

    <div class="cfg-nota">
      <p>Estas preferencias se guardan <strong>en este dispositivo</strong>, no en tu cuenta.
      Si entras desde el celular, allá las ajustas aparte.</p>
    </div>`;
},

/* ---- Integraciones ------------------------------------------------------- */
integraciones(){
  const num = botWhatsapp();
  const google = googleWorkspaceConectado();
  return `
    ${cfgHead('Integraciones', 'Servicios externos conectados a la aplicación.')}

    <div class="cfg-tit-sec">Google Workspace</div>
    <div class="cfg-lista">
      <div class="cfg-fila">
        <span class="bot-avatar" style="width:38px;height:38px;font-size:18px;border-radius:11px">G</span>
        <div class="cfg-fila-txt"><strong>Drive · Sheets · Calendar</strong>
          <small>Crea carpetas por proyecto, hojas de respuestas y eventos de entrega.</small></div>
        <span class="chip ${google?'o':'w'}">${google?'Conectado':'Requiere permiso'}</span>
        <button class="btn ${google?'':'pri'}" onclick="conectarGoogleWorkspace()">${google?'Renovar permiso':'Conectar Google'}</button>
      </div>
      ${google?`<div class="cfg-fila"><div class="cfg-fila-txt"><strong>Cuenta autorizada</strong>
        <small>${esc(usuario?.email||'Cuenta de Google')} · Los archivos creados pertenecen a esta cuenta.</small></div>
        <button class="btn" onclick="desconectarGoogleWorkspace()">Desactivar</button></div>`:''}
    </div>
    <div class="cfg-nota"><p>Drive y Calendar se administran desde cada proyecto. Sheets se crea y sincroniza desde el detalle de cada formulario.</p>
      <p>La primera conexión volverá a abrir Google para solicitar los permisos adicionales.</p></div>

    <div class="cfg-tit-sec">Mensajería</div>
    <div class="cfg-lista">
      <div class="cfg-fila">
        <span class="bot-avatar" style="width:38px;height:38px;font-size:18px;border-radius:11px">💬</span>
        <div class="cfg-fila-txt">
          <strong>Bot de legalización · WhatsApp</strong>
          <small>Al que le pasas las facturas para que las apruebe.
            Desde Caja menor se abre el chat con un clic.</small>
        </div>
        <span class="chip o">Conectado</span>
      </div>

      <div class="cfg-fila">
        <div class="cfg-fila-txt">
          <strong>Número del bot</strong>
          <small>${esc(whatsappLegible(num))}
            ${num === BOT_POR_DEFECTO ? '' : ' · personalizado'}</small>
        </div>
        <button class="btn" onclick="modalBotNumero()">Cambiar</button>
      </div>
    </div>

    <div class="cfg-nota">
      <p>El enlace usa <code>wa.me</code>, el formato oficial de WhatsApp:
      en el celular abre la aplicación y en el computador abre WhatsApp Web.
      <strong>No envía nada solo</strong> — solo abre la conversación.</p>
      <p>El número se guarda en este dispositivo, no en tu cuenta.</p>
    </div>

    <div class="cfg-tit-sec">Próxima integración</div>
    <div class="cfg-pendiente">
      <span class="chip w">Telegram</span>
      <p>El bot podrá enviar alertas programadas y recibir consultas. Para activarlo necesitaremos el token privado generado por @BotFather y el chat de destino.</p>
    </div>`;
},

/* ---- Preferencias -------------------------------------------------------- */
prefs(){
  const fila = (titulo, sub, control) => `
    <div class="cfg-fila">
      <div class="cfg-fila-txt"><strong>${esc(titulo)}</strong><small>${esc(sub)}</small></div>
      ${control}
    </div>`;

  return `
    ${cfgHead('Preferencias', 'Cómo se comporta la aplicación.')}

    <div class="cfg-lista">
      ${fila('Aviso de caja menor',
        `Te avisa al llegar al ${Math.round(CFG.topeAlertaCaja * 100)}% de la base.`,
        `<select onchange="fijarTope(this.value)">
          ${[0.6, 0.7, 0.75, 0.8, 0.9].map(v =>
            `<option value="${v}" ${CFG.topeAlertaCaja === v ? 'selected' : ''}>${v * 100}%</option>`).join('')}
        </select>`)}
    </div>

    <div class="cfg-tit-sec">Tus datos</div>
    <div class="cfg-lista">
      ${[['clientes','Clientes'],['beneficiarios','Mensajeros'],['caja','Movimientos de caja'],
         ['preguntas','Preguntas'],['tareas','Tareas'],['novedades','Novedades'],
         ['proyectos','Proyectos'],['listas','Opciones de listas']].map(([k, l]) => `
        <div class="cfg-fila">
          <div class="cfg-fila-txt"><strong>${l}</strong></div>
          <span class="chip n">${S[k].length}</span>
        </div>`).join('')}
    </div>

    <div class="cfg-fila-acciones">
      ${!NUBE ? `<button class="btn" onclick="cargarEjemplo()">Cargar datos de ejemplo</button>` : ''}
      <button class="btn peligro" onclick="vaciarTodo()">Vaciar todo</button>
    </div>

    <div class="cfg-nota">
      <p>${NUBE
        ? `Guardado en Supabase, sesión de <strong>${esc(usuario?.email || '')}</strong>.
           Se sincroniza entre tus dispositivos.`
        : `Guardado solo en este navegador. Si lo borras, se pierde.`}</p>
    </div>`;
}
};

/* ---- Filas ---------------------------------------------------------------- */

function filaPregunta(q){
  const t = TIPOS_RESPUESTA[q.tipo] || TIPOS_RESPUESTA.texto;
  const p = pro(q.proyecto_id);

  return `
  <div class="cfg-fila ${q.activa === false ? 'apagada' : ''}">
    <div class="cfg-fila-txt">
      <strong>${esc(q.texto)}</strong>
      <small>
        ${t.ico} ${t.l}${q.opciones?.length ? `: ${q.opciones.map(esc).join(' / ')}` : ''}
        ${p ? ` · ${esc(p.nombre)}` : ''}
        ${q.categoria ? ` · ${esc(q.categoria)}` : ''}
        ${q.obligatoria ? ' · obligatoria' : ''}
      </small>
    </div>
    <span class="chip ${q.activa === false ? 'n' : 'o'}">${q.activa === false ? 'Inactiva' : 'Activa'}</span>
    ${menuAcciones([
      ['Editar',    `modalPregunta('${q.id}')`],
      ['Duplicar',  `duplicarPregunta('${q.id}')`],
      [q.activa === false ? 'Activar' : 'Desactivar', `alternarPregunta('${q.id}')`],
      ['Eliminar',  `eliminarPregunta('${q.id}')`, 'peligro']
    ])}
  </div>`;
}

function filaListado(tipo, def){
  const valores = lista(tipo);
  const abierta = listaAbierta === tipo;

  return `
  <div class="cfg-bloque ${abierta ? 'abierto' : ''}">
    <button class="cfg-fila" onclick="abrirLista('${tipo}')">
      <div class="cfg-fila-txt">
        <strong>${esc(def.nombre)}</strong>
        <small>${esc(def.ayuda)}</small>
      </div>
      <span class="chip n">${valores.length}</span>
      ${listaPersonalizada(tipo) ? '' : '<span class="chip b">De fábrica</span>'}
      <span class="cfg-chevron">${abierta ? ICO.plegar : ICO.desplegar}</span>
    </button>

    ${abierta ? `
    <div class="cfg-sub">
      <div class="cfg-chips">
        ${valores.map(v => `
          <span class="cfg-op">${esc(v)}
            <button onclick="quitarDeLista('${tipo}', ${JSON.stringify(v).replace(/"/g,'&quot;')})"
                    title="Quitar">✕</button>
          </span>`).join('')}
      </div>
      <div class="cfg-alta">
        <input id="nuevo_${tipo}" placeholder="Agregar opción…"
               onkeydown="if(event.key==='Enter')agregarALista('${tipo}')">
        <button class="btn pri" onclick="agregarALista('${tipo}')">+ Agregar</button>
      </div>
      ${listaPersonalizada(tipo)
        ? `<button class="btn sm" style="margin-top:10px" onclick="restaurarLista('${tipo}')">
             ↺ Volver a los valores de fábrica</button>` : ''}
    </div>` : ''}
  </div>`;
}

function abrirLista(tipo){ listaAbierta = listaAbierta === tipo ? null : tipo; repintarPanel(); }

/* ---- Campos personalizados ---------------------------------------------- */
function modalCampoPersonalizado(id = null){
  const c = id ? (S.campos_personalizados || []).find(x => x.id === id) : null;
  const tipoVisible = c && (c.tipo === 'url' || (c.opciones || []).includes('__nexa_url__') || (/url|enlace/i.test(c.nombre) && c.tipo === 'texto')) ? 'url' : (c?.tipo || 'texto');
  openModal(formModal(id ? 'Editar campo personalizado' : 'Nuevo campo personalizado', `
    <div><label>Nombre del campo</label><input id="cpNombre" value="${esc(c?.nombre || '')}" placeholder="Ej. Número de contrato"></div>
    <div class="f2">
      <div><label>Se mostrará en</label><select id="cpEntidad">${[['proyectos','Proyectos'],['tareas','Tareas'],['novedades','Novedades'],['clientes','Clientes'],['caja','Caja menor']].map(([v,l]) => `<option value="${v}" ${(c?.entidad || 'proyectos') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label>Tipo de respuesta</label><select id="cpTipo" onchange="mostrarOpcionesCampo()">
        ${[['texto','Texto'],['url','URL / enlace'],['numero','Número'],['fecha','Fecha'],['seleccion','Selección'],['booleano','Sí / No']].map(([v,l]) => `<option value="${v}" ${tipoVisible === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></div>
    </div>
    <div><label>Ayuda o descripción (opcional)</label><input id="cpDesc" value="${esc(c?.descripcion || '')}" placeholder="Indica qué información debe registrarse"></div>
    <div id="cpOpciones"><label>Opciones, una por línea</label><textarea id="cpOps" placeholder="Interno\nCliente\nProveedor">${esc((c?.opciones || []).join('\n'))}</textarea></div>
    <div class="f-check"><label><input id="cpReq" type="checkbox" ${c?.obligatorio ? 'checked' : ''}> Obligatorio al guardar el proyecto</label></div>`,
    `guardarCampoPersonalizado(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear campo'));
  mostrarOpcionesCampo();
}

function mostrarOpcionesCampo(){
  const box = $('#cpOpciones'); if(box) box.style.display = $('#cpTipo')?.value === 'seleccion' ? 'block' : 'none';
}

async function guardarCampoPersonalizado(id = null){
  const nombre = $('#cpNombre').value.trim();
  if(!nombre){ toast('Escribe el nombre del campo'); return; }
  const tipo = $('#cpTipo').value;
  const opciones = tipo === 'seleccion' ? $('#cpOps').value.split('\n').map(x => x.trim()).filter(Boolean) : tipo === 'url' ? ['__nexa_url__'] : [];
  if(tipo === 'seleccion' && !opciones.length){ toast('Agrega al menos una opción'); return; }
  const entidad = $('#cpEntidad').value;
  const repetido = (S.campos_personalizados || []).some(c => c.id !== id && c.entidad === entidad && c.nombre.toLowerCase() === nombre.toLowerCase());
  if(repetido){ toast('Ya existe un campo con ese nombre'); return; }
  // Se guarda como texto + marcador para seguir funcionando antes de ejecutar
  // la migración SQL que agrega formalmente el tipo "url" en Supabase.
  const fila = { nombre, entidad, tipo:tipo === 'url' ? 'texto' : tipo, descripcion:$('#cpDesc').value.trim(), opciones,
    obligatorio:$('#cpReq').checked, activo:cActivo(id), orden:id ? ((S.campos_personalizados || []).find(c => c.id === id)?.orden || 0) : (S.campos_personalizados || []).length + 1 };
  const guardado = id ? await db.update('campos_personalizados', id, fila) : await db.insert('campos_personalizados', fila);
  if(!guardado) return;
  closeModal(); repintarPanel(); toast(id ? 'Campo actualizado ✓' : 'Campo creado ✓');
}

function cActivo(id){ return id ? (S.campos_personalizados || []).find(c => c.id === id)?.activo !== false : true; }

async function alternarCampoPersonalizado(id){
  const c = S.campos_personalizados.find(x => x.id === id);
  await db.update('campos_personalizados', id, { activo:c.activo === false }); repintarPanel();
  toast(c.activo === false ? 'Campo activado' : 'Campo desactivado');
}

function eliminarCampoPersonalizado(id){
  const c = S.campos_personalizados.find(x => x.id === id);
  confirmarPeligro('¿Eliminar este campo?', `“${c.nombre}” dejará de mostrarse. Los valores antiguos guardados en proyectos no se borrarán.`, async()=>{
    await db.remove('campos_personalizados', id); repintarPanel(); toast('Campo eliminado');
  });
}

/* ---- Acciones sobre listas ------------------------------------------------ */

async function agregarALista(tipo, inputId = null){
  const input = $('#' + (inputId || 'nuevo_' + tipo));
  const valor = input.value.trim();
  if(!valor){ toast('Escribe la opción'); return; }

  if(lista(tipo).some(v => v.toLowerCase() === valor.toLowerCase())){
    toast('Esa opción ya está en la lista'); return;
  }

  await materializarLista(tipo);
  await db.insert('listas', { tipo, valor, orden: lista(tipo).length + 1, activo: true });

  repintarPanel();
  setTimeout(() => $('#' + (inputId || 'nuevo_' + tipo))?.focus(), 40);
  toast('Agregado ✓');
}

function quitarDeLista(tipo, valor){
  const enUso = contarUso(tipo, valor);
  const detalle = enUso
    ? `"${valor}" está en uso en ${enUso} registro${enUso > 1 ? 's' : ''}.\n\n` +
      `Esos registros no cambian: seguirán mostrando "${valor}". Lo que pasa es que ` +
      `dejará de aparecer para elegir en los formularios nuevos.`
    : `"${valor}" dejará de aparecer en los formularios.`;

  confirmarPeligro('¿Quitar esta opción?', detalle, async () => {
    await materializarLista(tipo);
    const fila = S.listas.find(x => x.tipo === tipo && x.valor === valor);
    if(fila) await db.remove('listas', fila.id);
    repintarPanel();
    toast('Opción quitada');
  }, 'Quitar');
}

function restaurarLista(tipo){
  confirmarPeligro('¿Volver a los valores de fábrica?',
    'Se borran las opciones que agregaste en esta lista y vuelven las originales.',
    async () => {
      for(const f of S.listas.filter(x => x.tipo === tipo)) await db.remove('listas', f.id);
      repintarPanel();
      toast('Lista restaurada');
    }, 'Restaurar');
}

/** ¿Cuántos registros usan este valor? Para avisar antes de quitarlo. */
function contarUso(tipo, valor){
  const donde = {
    categoria_caja:   () => S.caja.filter(x => x.categoria === valor),
    metodo_pago:      () => S.caja.filter(x => x.metodo_pago === valor),
    banco:            () => S.beneficiarios.filter(x => x.banco === valor),
    tipo_cuenta:      () => S.beneficiarios.filter(x => x.tipo_cuenta === valor),
    tipo_doc:         () => S.beneficiarios.filter(x => x.tipo_doc === valor),
    rol_beneficiario: () => S.beneficiarios.filter(x => x.rol === valor),
    categoria_novedad:() => S.novedades.filter(x => x.categoria === valor),
    prioridad_tarea:  () => S.tareas.filter(x => x.prioridad === valor),
    categoria:        () => S.preguntas.filter(x => x.categoria === valor)
  }[tipo];
  return donde ? donde().length : 0;
}

/* ---- Número del bot ------------------------------------------------------ */
function modalBotNumero(){
  openModal(formModal('Número del bot', `
    <div><label>WhatsApp del bot</label>
      <input id="botNum" inputmode="tel" placeholder="3102064803"
             value="${esc(botWhatsapp())}"></div>
    <p style="font-size:11.5px;color:var(--text-2)">
      Puedes escribirlo con o sin el 57: si pones un celular colombiano de
      10 dígitos, el indicativo se agrega solo.</p>
    <div id="botPrev" style="font-size:13px;color:var(--text-2)"></div>`,
    'guardarBotNumero()', 'Guardar'));

  const prev = () => {
    const d = normalizarWhatsapp($('#botNum').value);
    $('#botPrev').innerHTML = d
      ? `Quedará como <strong>${esc(whatsappLegible(d))}</strong>`
      : '<span style="color:var(--danger)">Escribe un número</span>';
  };
  $('#botNum').addEventListener('input', prev);
  prev();
}

async function guardarBotNumero(){
  const d = normalizarWhatsapp($('#botNum').value);
  if(d.length < 10){ toast('El número no parece válido'); return; }
  localStorage.setItem('hub_bot_wa', d);
  closeModal(); render(); toast('Número actualizado ✓');
}

/* ---- Contraseña ----------------------------------------------------------
   Estando ya dentro no hace falta la contraseña vieja: la sesión es la prueba.
   Sirve tanto para cambiarla como para crear la primera en cuentas de Google.
   -------------------------------------------------------------------------- */
function modalPassword(){
  openModal(formModal('Contraseña de acceso', `
    <p style="font-size:13px;color:var(--text-2);margin-bottom:2px">
      Estás dentro, así que no hace falta la contraseña anterior.
      Con esta podrás entrar desde el celular sin usar Google.
    </p>
    <div><label>Nueva contraseña</label>
      <input id="pw1" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></div>
    <div><label>Repítela</label>
      <input id="pw2" type="password" autocomplete="new-password" placeholder="••••••••"
             onkeydown="if(event.key==='Enter')guardarPassword()"></div>
    <div id="pwErr" class="alert d" style="display:none;font-size:12.5px"></div>`,
    'guardarPassword()', 'Guardar'));
}

async function guardarPassword(){
  const p1 = $('#pw1').value, p2 = $('#pw2').value;
  const err = t => { const e = $('#pwErr'); e.textContent = t; e.style.display = 'flex'; };

  if(p1.length < 6){ err('La contraseña debe tener al menos 6 caracteres'); return; }
  if(p1 !== p2){ err('Las dos contraseñas no coinciden'); return; }

  const { error } = await sb.auth.updateUser({ password: p1 });
  if(error){ err(traducir(error.message)); return; }

  // La sesión trae ahora el proveedor 'email'
  await sesionActual();
  closeModal(); render();
  toast('Contraseña guardada ✓ — ya puedes entrar con ella');
}

/* ---- Preferencias de apariencia ------------------------------------------ */

function fijarTema(t){
  localStorage.setItem(CFG.themeKey, t);
  aplicarTema(t);
  repintarPanel();
}

function fijarAcento(hex){
  if(hex) localStorage.setItem('hub_acento', hex);
  else    localStorage.removeItem('hub_acento');
  aplicarAcento();
  repintarPanel();
}

function fijarDensidad(d){
  localStorage.setItem('hub_densidad', d);
  document.documentElement.setAttribute('data-densidad', d);
  repintarPanel();
}

async function fijarTope(v){
  CFG.topeAlertaCaja = +v;
  localStorage.setItem('hub_tope_caja', v);
  repintarPanel();
  toast('Aviso actualizado');
}
