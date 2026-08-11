/* ============================================================================
   ACCIONES DE AGENDA — crear y editar eventos
   El formulario se arma según el tipo elegido: cada uno pide solo lo suyo.
   ========================================================================== */

/** Los bloques de campos. La clave la declara cada tipo en TIPOS_EVENTO. */
const CAMPOS_EVENTO = {

  persona: ev => `
    <div><label>¿De quién?</label>
      <select id="evPersona" onchange="autoTituloEvento()">
        <option value="">— Escribo el nombre a mano —</option>
        ${S.colaboradores.filter(c => c.activo !== false).map(c =>
          `<option value="${c.id}" ${ev?.persona_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
      </select>
      <div style="font-size:11.5px;color:var(--text-2);margin-top:5px">
        Si es un colaborador registrado, elígelo y queda enlazado a su ficha.</div>
    </div>`,

  horas: ev => `
    <div class="f2">
      <div><label>Hora de inicio</label>
        <input type="time" id="evHora" value="${esc(ev?.hora || '09:00')}"></div>
      <div><label>Hora de fin</label>
        <input type="time" id="evHoraFin" value="${esc(ev?.hora_fin || '')}"></div>
    </div>`,

  rango: ev => `
    <div><label>Hasta (si dura varios días)</label>
      <input type="date" id="evFechaFin" value="${ev?.fecha_fin || ''}">
      <div style="font-size:11.5px;color:var(--text-2);margin-top:5px">
        Déjalo vacío si es de un solo día.</div>
    </div>`,

  lugar: ev => `
    <div><label>Lugar o enlace</label>
      <input id="evLugar" placeholder="Ej. Sede Cafam calle 51, o el enlace de Meet"
             value="${esc(ev?.lugar || '')}"></div>`,

  asistentes: ev => `
    <div><label>¿Quiénes van?</label>
      <input id="evAsistentes" placeholder="Ej. Carlos, Diana, el coordinador de zona"
             value="${esc(ev?.asistentes || '')}"></div>`,

  agenda: ev => `
    <div><label>Agenda / temas</label>
      <textarea id="evAgenda" placeholder="Los puntos a tratar">${esc(ev?.agenda || '')}</textarea></div>`,

  monto: ev => `
    <div><label>Monto (COP)</label>
      <input id="evMonto" type="number" inputmode="numeric" placeholder="150000"
             value="${ev?.monto || ''}"></div>`,

  beneficiario: ev => `
    <div><label>¿A quién se le paga?</label>
      <select id="evBenef">
        <option value="">— Sin definir —</option>
        ${S.beneficiarios.filter(b => b.activo).map(b =>
          `<option value="${b.id}" ${ev?.beneficiario_id === b.id ? 'selected' : ''}>${esc(b.nombre)}</option>`).join('')}
      </select></div>`,

  cliente: ev => `
    <div><label>Cliente (opcional)</label>
      <select id="evCliente">${optsCli(ev?.cliente_id)}</select></div>`,

  aviso: ev => `
    <div><label>Avisarme</label>
      <select id="evAviso">
        ${Object.entries(AVISOS).map(([d, l]) =>
          `<option value="${d}" ${String(ev?.aviso ?? 1) === d ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <div style="font-size:11.5px;color:var(--text-2);margin-top:5px">
        El aviso aparece en Inicio al abrir la app. No suena en el celular.</div>
    </div>`
};

/* ---- Formulario ---------------------------------------------------------- */

function modalEvento(id = null, fechaPreset = null){
  const ev = id ? S.eventos.find(x => x.id === id) : null;
  const tipo = ev?.tipo || 'recordatorio';

  openModal(formModal(id ? 'Editar evento' : 'Nuevo evento', `
    <div><label>Tipo</label>
      <select id="evTipo" onchange="pintarCamposEvento()">
        ${Object.entries(TIPOS_EVENTO).map(([k, v]) =>
          `<option value="${k}" ${tipo === k ? 'selected' : ''}>${v.ico}  ${v.l}</option>`).join('')}
      </select>
      <div id="evAyuda" style="font-size:11.5px;color:var(--text-2);margin-top:5px"></div>
    </div>

    <div><label>Título</label>
      <input id="evTitulo" placeholder="Ej. Cumpleaños de Carlos"
             value="${esc(ev?.titulo || '')}"></div>

    <div><label id="evFechaLbl">Fecha</label>
      <input type="date" id="evFecha" value="${ev?.fecha || fechaPreset || hoyISO()}">
      <div id="evFechaAyuda" style="font-size:11.5px;color:var(--text-2);margin-top:5px"></div>
    </div>

    <!-- Lo que pida el tipo elegido -->
    <div id="evCampos" style="display:grid;gap:13px"></div>

    <div><label>Notas</label>
      <textarea id="evNotas" placeholder="Lo que convenga recordar">${esc(ev?.notas || '')}</textarea></div>`,
    `guardarEvento(${id ? `'${id}'` : 'null'})`, id ? 'Guardar cambios' : 'Crear evento'));

  _evEditando = ev;
  pintarCamposEvento();
}

let _evEditando = null;

/** Redibuja solo los campos propios del tipo, conservando lo ya escrito. */
function pintarCamposEvento(){
  const tipo = $('#evTipo').value;
  const t = tipoEvento(tipo);

  $('#evAyuda').textContent = t.ayuda;
  $('#evFechaLbl').textContent = t.anual ? 'Fecha de nacimiento' : 'Fecha';
  $('#evFechaAyuda').textContent = t.anual
    ? 'Si sabes el año, se calcula la edad. Si no, pon cualquiera: solo importan el día y el mes.'
    : '';

  // Solo se conserva lo del evento en edición si el tipo no cambió
  const base = (_evEditando && _evEditando.tipo === tipo) ? _evEditando : null;
  $('#evCampos').innerHTML = t.campos.map(c => CAMPOS_EVENTO[c](base)).join('');

  autoTituloEvento();
}

/** Si eliges a una persona y el título está vacío, se propone solo. */
function autoTituloEvento(){
  const sel = $('#evPersona'), tit = $('#evTitulo');
  if(!sel || !tit || tit.value.trim()) return;
  const c = colab(sel.value);
  if(c) tit.value = `Cumpleaños de ${c.nombre}`;
}

async function guardarEvento(id = null){
  const titulo = $('#evTitulo').value.trim();
  if(!titulo){ toast('Ponle un título'); return; }

  const tipo = $('#evTipo').value;
  const v = sel => document.getElementById(sel)?.value ?? null;

  const fila = {
    tipo, titulo,
    fecha:      $('#evFecha').value,
    fecha_fin:  v('evFechaFin') || null,
    hora:       v('evHora') || '',
    hora_fin:   v('evHoraFin') || '',
    lugar:      v('evLugar') || '',
    asistentes: v('evAsistentes') || '',
    agenda:     v('evAgenda') || '',
    monto:      +v('evMonto') || 0,
    persona_id:      v('evPersona') || null,
    beneficiario_id: v('evBenef') || null,
    cliente_id:      v('evCliente') || null,
    aviso:  +(v('evAviso') ?? 1),
    notas:  $('#evNotas').value.trim()
  };

  if(fila.fecha_fin && fila.fecha_fin < fila.fecha){
    toast('La fecha de fin no puede ser anterior al inicio'); return;
  }

  if(id) await db.update('eventos', id, fila);
  else    await db.insert('eventos', fila);

  closeModal(); render();
  toast(id ? 'Evento actualizado ✓' : 'Evento creado ✓');
}

function eliminarEvento(id){
  const ev = S.eventos.find(x => x.id === id);
  confirmarPeligro('¿Eliminar este evento?',
    `"${ev.titulo}"\n\nEsta acción no se puede deshacer.`,
    async () => { await db.remove('eventos', id); render(); toast('Evento eliminado'); });
}

/** Ficha del evento, al tocarlo en el calendario. */
function verEvento(id){
  const ev = S.eventos.find(x => x.id === id);
  if(!ev) return;

  const t = tipoEvento(ev.tipo);
  const prox = proximaOcurrencia(ev);
  const persona = colab(ev.persona_id);
  const b = ben(ev.beneficiario_id);

  const dato = (etiqueta, valor) => valor ? `
    <div class="ficha-fila"><span>${esc(etiqueta)}</span><strong>${valor}</strong></div>` : '';

  openModal(`
    <div class="modal-h">
      <h3>${t.ico} ${esc(ev.titulo)}</h3>
      <button class="btn sm" onclick="closeModal()">✕</button>
    </div>

    <div class="modal-b" style="gap:0">
      <div class="ficha-monto">
        <div style="font-size:15px;font-weight:650;color:${t.color}">${t.l}</div>
        <div class="ficha-monto-val" style="font-size:22px;margin-top:6px">
          ${prox ? fechaTxt(prox) : 'Ya pasó'}</div>
        ${prox ? `<div style="font-size:12.5px;color:var(--text-2);margin-top:4px">
          ${fechaCorta(prox)}${ev.hora ? ` · ${esc(ev.hora)}${ev.hora_fin ? ' a ' + esc(ev.hora_fin) : ''}` : ''}
        </div>` : ''}
      </div>

      <div class="ficha">
        ${dato('Se repite', t.anual ? 'Cada año' : '')}
        ${dato('Edad que cumple', prox ? edadEn(ev, prox) : null)}
        ${dato('Hasta', ev.fecha_fin ? fechaCorta(ev.fecha_fin) : '')}
        ${dato('Lugar', esc(ev.lugar))}
        ${dato('Quiénes van', esc(ev.asistentes))}
        ${dato('Persona', persona ? esc(persona.nombre) + (persona.cargo ? ` · ${esc(persona.cargo)}` : '') : '')}
        ${dato('Cliente', ev.cliente_id ? cliTag(ev.cliente_id) : '')}
        ${dato('Monto', ev.monto ? cop(ev.monto) : '')}
        ${dato('Se le paga a', b ? esc(b.nombre) : '')}
        ${dato('Aviso', AVISOS[ev.aviso ?? 1])}
      </div>

      ${ev.agenda ? `<div class="ficha-tit">Agenda</div>
        <p style="font-size:13.5px;color:var(--text-2);white-space:pre-line">${esc(ev.agenda)}</p>` : ''}
      ${ev.notas ? `<div class="ficha-tit">Notas</div>
        <p style="font-size:13.5px;color:var(--text-2);white-space:pre-line">${esc(ev.notas)}</p>` : ''}
    </div>

    <div class="modal-f">
      <button class="btn dgr" onclick="closeModal();eliminarEvento('${ev.id}')">Eliminar</button>
      <button class="btn" onclick="closeModal();tareaDesdeEvento('${ev.id}')">+ Tarea</button>
      <button class="btn pri" onclick="closeModal();modalEvento('${ev.id}')">✎ Editar</button>
    </div>`);
}

/** Crea una tarea de preparación para el evento, unos días antes. */
function tareaDesdeEvento(id){
  const ev = S.eventos.find(x => x.id === id);
  const prox = proximaOcurrencia(ev) || ev.fecha;
  const antes = dISO(new Date(new Date(prox + 'T00:00:00').getTime() - 86400000));

  modalTarea();
  setTimeout(() => {
    $('#mT').value = `Preparar: ${ev.titulo}`;
    $('#mV').value = antes;
    if(ev.cliente_id){ $('#mC').value = ev.cliente_id; sincronizarCeco(); }
    if(ev.persona_id){ $('#mPersona').value = ev.persona_id; sincronizarPersona(true); }
    const tipo = $('#mTipo');
    if(tipo && ev.tipo === 'reunion') tipo.value = 'Reunión';
  }, 80);
}
