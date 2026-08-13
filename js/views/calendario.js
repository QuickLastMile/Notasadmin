/* ============================================================================
   VISTA: CALENDARIO
   ----------------------------------------------------------------------------
   Tareas y eventos en el mismo lienzo, porque el día es uno solo.
   Dos formas de verlo: la cuadrícula del mes (para ubicarse) y la agenda
   corrida (para leer qué viene, que es lo que sirve en el celular).
   ========================================================================== */

let calMes   = null;          // 'YYYY-MM'; null = mes actual
let calVista = 'mes';         // mes | agenda
let calDiaSel = null;         // día tocado en la cuadrícula
let calClickTimer = null;

const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const mesActual = () => calMes || hoyISO().slice(0, 7);

function moverMes(delta){
  const [a, m] = mesActual().split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  calMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  calDiaSel = null;
  render();
}

function irHoy(){ calMes = null; calDiaSel = hoyISO(); render(); }
function setCalVista(v){ calVista = v; render(); }
function tocarDia(iso){ calDiaSel = calDiaSel === iso ? null : iso; render(); }
function clickDiaCalendario(iso){
  clearTimeout(calClickTimer);
  calClickTimer=setTimeout(()=>{calClickTimer=null;tocarDia(iso);},230);
}
function crearEventoEnDia(iso){
  clearTimeout(calClickTimer);calClickTimer=null;calDiaSel=iso;modalEvento(null,iso);
}

/** Todo lo que cae un día: tareas con vencimiento y eventos. */
function delDia(iso){
  const tareas = S.tareas.filter(t => t.vence === iso &&
    t.estado !== 'cancelada');
  const eventos = S.eventos.filter(ev => eventoEnFecha(ev, iso));
  return { tareas, eventos, total: tareas.length + eventos.length };
}

/* ========================================================================== */
function vCalendario(m){
  const acciones = `
    <button class="btn" onclick="modalTarea()">+ Tarea</button>
    <button class="btn pri" onclick="modalEvento()">+ Evento</button>`;

  const avisos = eventosEnAviso();

  return `
  ${pageHead('Calendario',
    'Tus tareas y tus fechas especiales en un solo lugar.', acciones)}

  ${avisos.length ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-h"><h2>🔔 Se vienen</h2>
        <span class="chip w">${avisos.length}</span></div>
      <div class="card-b flush">
        ${avisos.map(({ ev, cuando, faltan }) => `
          <div class="row" style="cursor:pointer" onclick="verEvento('${ev.id}')">
            <span style="font-size:19px">${tipoEvento(ev.tipo).ico}</span>
            <div class="row-main">
              <div class="row-t">${esc(ev.titulo)}
                ${edadEn(ev, cuando) ? `<span class="chip b">cumple ${edadEn(ev, cuando)}</span>` : ''}</div>
              <div class="row-s">
                <span>${tipoEvento(ev.tipo).l}</span>
                <span>${fechaCorta(cuando)}${ev.hora ? ' · ' + esc(ev.hora) : ''}</span>
                ${ev.lugar ? `<span>📍 ${esc(ev.lugar)}</span>` : ''}
              </div>
            </div>
            <span class="chip ${faltan === 0 ? 'd' : faltan <= 2 ? 'w' : 'n'}">
              ${faltan === 0 ? 'Hoy' : faltan === 1 ? 'Mañana' : `En ${faltan} días`}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

  <div class="cal-barra">
    <div class="cal-nav">
      <button class="btn sm" onclick="moverMes(-1)" aria-label="Mes anterior">‹</button>
      <strong>${esc(nombreMesDe(mesActual()))}</strong>
      <button class="btn sm" onclick="moverMes(1)" aria-label="Mes siguiente">›</button>
      <button class="btn sm" onclick="irHoy()">Hoy</button>
    </div>
    <div class="seg">
      <button class="${calVista === 'mes' ? 'on' : ''}" onclick="setCalVista('mes')">Mes</button>
      <button class="${calVista === 'agenda' ? 'on' : ''}" onclick="setCalVista('agenda')">Agenda</button>
    </div>
  </div>

  ${calVista === 'mes' ? cuadriculaMes() : agendaMes()}`;
}

function nombreMesDe(ym){
  const [a, m] = ym.split('-').map(Number);
  return nombreMes(new Date(a, m - 1, 1));
}

/* ---- Cuadrícula del mes --------------------------------------------------- */
function cuadriculaMes(){
  const [anio, mes] = mesActual().split('-').map(Number);
  const primero = new Date(anio, mes - 1, 1);
  const dias    = new Date(anio, mes, 0).getDate();

  // La semana arranca en lunes: getDay() da 0 para domingo
  const desfase = (primero.getDay() + 6) % 7;

  const celdas = [];
  for(let i = 0; i < desfase; i++) celdas.push(null);
  for(let d = 1; d <= dias; d++)
    celdas.push(`${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  while(celdas.length % 7) celdas.push(null);

  return `
  <div class="card">
    <div class="cal-grid cal-cabecera">
      ${DIAS_SEMANA.map(d => `<div class="cal-dia-nom">${d}</div>`).join('')}
    </div>
    <div class="cal-grid">
      ${celdas.map(iso => iso ? celdaDia(iso) : '<div class="cal-celda vacia"></div>').join('')}
    </div>
  </div>

  ${calDiaSel ? panelDia(calDiaSel) : ''}`;
}

function celdaDia(iso){
  const { tareas, eventos, total } = delDia(iso);
  const esHoy = iso === hoyISO();
  const finde = [0, 6].includes(new Date(iso + 'T00:00:00').getDay());

  // Máximo tres etiquetas: más de eso ilegible y se resume con "+N"
  const items = [
    ...eventos.map(ev => ({ txt: tituloEvento(ev, iso), color: tipoEvento(ev.tipo).color,
                            fn: `verEvento('${ev.id}')` })),
    ...tareas.map(t => ({ txt: t.titulo,
                          color: t.estado === 'hecho' ? 'var(--text-3)'
                               : diasDesde(iso) < 0 ? 'var(--danger)' : 'var(--brand)',
                          hecho: t.estado === 'hecho',
                          fn: `verTarea('${t.id}')` }))
  ];

  return `
  <div class="cal-celda ${esHoy ? 'hoy' : ''} ${finde ? 'finde' : ''}
       ${calDiaSel === iso ? 'sel' : ''}" onclick="clickDiaCalendario('${iso}')"
       ondblclick="crearEventoEnDia('${iso}')" title="Doble clic para crear un evento">
    <div class="cal-num">${+iso.slice(8)}</div>
    <div class="cal-items">
      ${items.slice(0, 3).map(i => `
        <button class="cal-item ${i.hecho ? 'hecho' : ''}" style="--c:${i.color}"
                onclick="event.stopPropagation();${i.fn}" title="${esc(i.txt)}">
          ${esc(i.txt)}</button>`).join('')}
      ${total > 3 ? `<div class="cal-mas">+${total - 3} más</div>` : ''}
    </div>
  </div>`;
}

/** Al tocar un día: qué hay y el atajo para crear ahí mismo. */
function panelDia(iso){
  const { tareas, eventos } = delDia(iso);

  return `
  <div class="card" style="margin-top:14px">
    <div class="card-h">
      <h2>${esc(fechaLarga(iso))}${iso === hoyISO() ? ' · hoy' : ''}</h2>
      <div style="display:flex;gap:6px">
        <button class="btn sm" onclick="nuevaTareaEnDia('${iso}')">+ Tarea</button>
        <button class="btn sm pri" onclick="modalEvento(null,'${iso}')">+ Evento</button>
      </div>
    </div>
    <div class="card-b flush">
      ${eventos.map(ev => `
        <div class="row" style="cursor:pointer" onclick="verEvento('${ev.id}')">
          <span style="font-size:19px">${tipoEvento(ev.tipo).ico}</span>
          <div class="row-main">
            <div class="row-t">${esc(ev.titulo)}
              ${edadEn(ev, iso) ? `<span class="chip b">cumple ${edadEn(ev, iso)}</span>` : ''}</div>
            <div class="row-s">
              <span>${tipoEvento(ev.tipo).l}</span>
              ${ev.hora ? `<span>${esc(ev.hora)}${ev.hora_fin ? ' a ' + esc(ev.hora_fin) : ''}</span>` : ''}
              ${ev.lugar ? `<span>📍 ${esc(ev.lugar)}</span>` : ''}
              ${ev.monto ? `<span>${cop(ev.monto)}</span>` : ''}
            </div>
          </div>
        </div>`).join('')}
      ${tareas.map(rowTarea).join('')}
      ${!eventos.length && !tareas.length
        ? vacio('📭', 'Nada agendado para este día') : ''}
    </div>
  </div>`;
}

function fechaLarga(iso){
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })
    .replace(/^\w/, c => c.toUpperCase());
}

function nuevaTareaEnDia(iso){
  modalTarea();
  setTimeout(() => { const v = $('#mV'); if(v) v.value = iso; }, 80);
}

/* ---- Agenda: la lista corrida del mes ------------------------------------- */
function agendaMes(){
  const [anio, mes] = mesActual().split('-').map(Number);
  const dias = new Date(anio, mes, 0).getDate();
  const filas = [];

  for(let d = 1; d <= dias; d++){
    const iso = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const { tareas, eventos, total } = delDia(iso);
    if(total) filas.push({ iso, tareas, eventos });
  }

  if(!filas.length) return `
    <div class="card"><div class="card-b flush">
      ${vacio('📅', `Nada agendado en ${nombreMesDe(mesActual()).toLowerCase()}`)}
    </div></div>`;

  return filas.map(({ iso, tareas, eventos }) => `
    <div class="card" style="margin-bottom:12px">
      <div class="card-h">
        <h2>${esc(fechaLarga(iso))}
          ${iso === hoyISO() ? '<span class="chip w">Hoy</span>' : ''}</h2>
        <button class="btn sm" onclick="tocarDia('${iso}');setCalVista('mes')">Ver el día</button>
      </div>
      <div class="card-b flush">
        ${eventos.map(ev => `
          <div class="row" style="cursor:pointer" onclick="verEvento('${ev.id}')">
            <span style="font-size:19px">${tipoEvento(ev.tipo).ico}</span>
            <div class="row-main">
              <div class="row-t">${esc(ev.titulo)}
                ${edadEn(ev, iso) ? `<span class="chip b">cumple ${edadEn(ev, iso)}</span>` : ''}</div>
              <div class="row-s">
                <span>${tipoEvento(ev.tipo).l}</span>
                ${ev.hora ? `<span>${esc(ev.hora)}</span>` : ''}
                ${ev.lugar ? `<span>📍 ${esc(ev.lugar)}</span>` : ''}
              </div>
            </div>
          </div>`).join('')}
        ${tareas.map(rowTarea).join('')}
      </div>
    </div>`).join('');
}
