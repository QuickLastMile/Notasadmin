/* ============================================================================
   TABLAS AJUSTABLES
   ----------------------------------------------------------------------------
   Un concepto largo estiraba su columna y empujaba la tabla a lo ancho.
   Ahora el texto se recorta con puntos suspensivos y cada columna se puede
   arrastrar desde su borde para darle el ancho que necesites. El ancho queda
   guardado por tabla, así que no hay que reajustarlo cada vez.

   Doble clic en el borde devuelve esa columna a su ancho automático.
   ========================================================================== */

const anchosGuardados = clave => {
  try{ return JSON.parse(localStorage.getItem('hub_cols_' + clave) || '{}'); }
  catch{ return {}; }
};
const guardarAnchos = (clave, obj) =>
  localStorage.setItem('hub_cols_' + clave, JSON.stringify(obj));

/** Prepara una tabla: aplica los anchos guardados y pone los tiradores. */
function hacerAjustable(tabla){
  if(tabla.dataset.lista) return;          // ya preparada en este render
  tabla.dataset.lista = '1';

  const clave = tabla.dataset.cols || 'default';
  const anchos = anchosGuardados(clave);
  const ths = [...tabla.querySelectorAll('thead th')];

  ths.forEach((th, i) => {
    if(anchos[i]) th.style.width = anchos[i] + 'px';
    if(i === ths.length - 1) return;       // la última no se arrastra

    const grip = document.createElement('div');
    grip.className = 'col-grip';
    grip.title = 'Arrastra para ajustar · doble clic para restablecer';
    grip.addEventListener('pointerdown', e => arrastrarColumna(e, th, i, clave));
    grip.addEventListener('dblclick', e => {
      e.stopPropagation();
      th.style.width = '';
      const a = anchosGuardados(clave); delete a[i]; guardarAnchos(clave, a);
    });
    th.appendChild(grip);
  });
}

function arrastrarColumna(e, th, indice, clave){
  e.preventDefault();
  e.stopPropagation();

  const xInicial = e.clientX;
  const anchoInicial = th.getBoundingClientRect().width;
  const grip = e.currentTarget;
  grip.classList.add('activa');
  document.body.style.cursor = 'col-resize';

  const mover = ev => {
    // 70 px es lo mínimo para que la cabecera siga siendo legible
    const nuevo = Math.max(70, anchoInicial + (ev.clientX - xInicial));
    th.style.width = nuevo + 'px';
  };

  const soltar = () => {
    grip.classList.remove('activa');
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', soltar);

    const a = anchosGuardados(clave);
    a[indice] = Math.round(th.getBoundingClientRect().width);
    guardarAnchos(clave, a);
  };

  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', soltar);
}

/** Alterna entre recortar el texto y dejarlo fluir en varias líneas. */
function alternarEnvoltura(clave){
  const envuelve = localStorage.getItem('hub_wrap_' + clave) === '1';
  localStorage.setItem('hub_wrap_' + clave, envuelve ? '0' : '1');
  render();
}
const envuelveTexto = clave => localStorage.getItem('hub_wrap_' + clave) === '1';

/** Devuelve los anchos de una tabla a como estaban. */
function restablecerColumnas(clave){
  localStorage.removeItem('hub_cols_' + clave);
  render();
  toast('Columnas restablecidas');
}

/** Se llama después de cada render: prepara las tablas que aparecieron. */
function prepararTablas(){
  document.querySelectorAll('table.tabla-ajustable').forEach(hacerAjustable);
}
