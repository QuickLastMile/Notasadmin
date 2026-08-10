/* ============================================================================
   VISTA: CONFIGURACIÓN
   Aquí se editan las listas de todos los desplegables de la app.
   ========================================================================== */

let listaAbierta = null;

function abrirLista(tipo){
  listaAbierta = listaAbierta === tipo ? null : tipo;
  render();
}

function vConfig(){
  return `
  ${pageHead('Configuración',
    'Las opciones de cada desplegable de la app. Agrega, renombra o quita lo que no uses.', '')}

  <div class="grid g2">
    <div class="card span-all">
      <div class="card-h"><h2>📋 Listas desplegables</h2>
        <span class="chip n">${Object.keys(LISTAS).length}</span></div>
      <div class="card-b flush">
        ${Object.entries(LISTAS).map(([tipo, def]) => bloqueLista(tipo, def)).join('')}
      </div>
    </div>

    <div class="card span-all">
      <div class="card-h"><h2>🔒 Estados fijos</h2></div>
      <div class="card-b">
        <p style="font-size:13px;color:var(--text-2);margin-bottom:13px">
          Estos no se pueden cambiar: la app razona sobre ellos para calcular
          el arqueo, las alertas y el cierre del pago. Si se pudieran renombrar,
          esos cálculos dejarían de funcionar.
        </p>
        <div style="display:grid;gap:9px">
          ${Object.values(ESTADOS_PAGO).map(e => `
            <div style="display:flex;gap:10px;align-items:flex-start">
              <span class="chip ${e.c}">${e.ico} ${e.l}</span>
              <span style="font-size:12.5px;color:var(--text-2);flex:1">${esc(e.ayuda)}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="card span-all">
      <div class="card-h"><h2>💾 Tus datos</h2></div>
      <div class="card-b">
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
             gap:10px;text-align:center;margin-bottom:16px">
          ${[['clientes','Clientes'],['beneficiarios','Mensajeros'],['caja','Movimientos'],
             ['tareas','Tareas'],['novedades','Novedades'],['proyectos','Proyectos']]
            .map(([k, l]) => `
            <div style="padding:11px;background:var(--surface-2);border-radius:12px">
              <div style="font-size:20px;font-weight:750">${S[k].length}</div>
              <div style="font-size:10.5px;color:var(--text-3);text-transform:uppercase;
                   letter-spacing:.5px;font-weight:700">${l}</div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn" onclick="cargarEjemplo()">◔ Cargar datos de ejemplo</button>
          <button class="btn dgr" onclick="vaciarTodo()">🗑 Vaciar todo</button>
        </div>
        <p style="font-size:11.5px;color:var(--text-3);margin-top:11px">
          ${NUBE ? `Guardado en Supabase · sesión de ${esc(usuario?.email || '')}`
                 : 'Guardado solo en este navegador'}
        </p>
      </div>
    </div>
  </div>`;
}

function bloqueLista(tipo, def){
  const valores = lista(tipo);
  const abierta = listaAbierta === tipo;
  const propia  = listaPersonalizada(tipo);

  return `
  <div>
    <button class="row" style="width:100%;text-align:left;background:none"
            onclick="abrirLista('${tipo}')">
      <span style="font-size:17px;width:24px;text-align:center">${def.icono}</span>
      <div class="row-main">
        <div class="row-t">${esc(def.nombre)}
          <span class="chip n">${valores.length}</span>
          ${propia ? '' : '<span class="chip b">De fábrica</span>'}
        </div>
        <div class="row-s"><span>${esc(def.ayuda)}</span></div>
      </div>
      <span style="color:var(--text-3);font-size:13px">${abierta ? '▲' : '▼'}</span>
    </button>

    ${abierta ? `
    <div style="padding:4px 16px 16px;background:var(--surface-2)">
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 13px">
        ${valores.map(v => `
          <span class="chip n" style="padding:6px 6px 6px 11px;font-size:12px">
            ${esc(v)}
            <button onclick="quitarDeLista('${tipo}', ${JSON.stringify(v).replace(/"/g, '&quot;')})"
                    style="color:var(--danger);font-weight:700;padding:0 3px"
                    title="Quitar">✕</button>
          </span>`).join('')}
      </div>

      <div style="display:flex;gap:8px">
        <input id="nuevo_${tipo}" placeholder="Agregar opción…"
               style="flex:1;padding:9px 12px;border:1.5px solid var(--border);
                      border-radius:10px;background:var(--surface);font-size:15px"
               onkeydown="if(event.key==='Enter')agregarALista('${tipo}')">
        <button class="btn pri" onclick="agregarALista('${tipo}')">Agregar</button>
      </div>

      ${propia ? `
        <button class="btn sm" style="margin-top:11px" onclick="restaurarLista('${tipo}')">
          ↺ Volver a los valores de fábrica</button>` : ''}
    </div>` : ''}
  </div>`;
}

/* ---- Acciones ------------------------------------------------------------ */

async function agregarALista(tipo){
  const input = $('#nuevo_' + tipo);
  const valor = input.value.trim();
  if(!valor){ toast('Escribe la opción'); return; }

  if(lista(tipo).some(v => v.toLowerCase() === valor.toLowerCase())){
    toast('Esa opción ya está en la lista'); return;
  }

  // La primera edición copia los valores de fábrica, para poder tocarlos
  await materializarLista(tipo);
  await db.insert('listas', { tipo, valor, orden: lista(tipo).length + 1, activo: true });

  render();
  setTimeout(() => $('#nuevo_' + tipo)?.focus(), 40);
  toast('Agregado ✓');
}

async function quitarDeLista(tipo, valor){
  const enUso = contarUso(tipo, valor);
  if(enUso && !confirm(
      `"${valor}" está en uso en ${enUso} registro${enUso > 1 ? 's' : ''}.\n\n` +
      `Quitarlo de la lista no cambia esos registros: siguen mostrando "${valor}", ` +
      `pero ya no aparecerá para elegir en los formularios.\n\n¿Continuar?`)) return;

  await materializarLista(tipo);
  const fila = S.listas.find(x => x.tipo === tipo && x.valor === valor);
  if(fila) await db.remove('listas', fila.id);
  render();
  toast('Quitado');
}

async function restaurarLista(tipo){
  if(!confirm('Esto devuelve la lista a los valores originales y borra tus cambios. ¿Continuar?')) return;
  for(const f of S.listas.filter(x => x.tipo === tipo)) await db.remove('listas', f.id);
  render();
  toast('Lista restaurada');
}

/** ¿Cuántos registros usan este valor? Para avisar antes de quitarlo. */
function contarUso(tipo, valor){
  const donde = {
    categoria_caja:  () => S.caja.filter(x => x.categoria === valor),
    metodo_pago:     () => S.caja.filter(x => x.metodo_pago === valor),
    banco:           () => S.beneficiarios.filter(x => x.banco === valor),
    tipo_cuenta:     () => S.beneficiarios.filter(x => x.tipo_cuenta === valor),
    tipo_doc:        () => S.beneficiarios.filter(x => x.tipo_doc === valor),
    rol_beneficiario:() => S.beneficiarios.filter(x => x.rol === valor),
    categoria_novedad:() => S.novedades.filter(x => x.categoria === valor),
    prioridad_tarea: () => S.tareas.filter(x => x.prioridad === valor)
  }[tipo];
  return donde ? donde().length : 0;
}
