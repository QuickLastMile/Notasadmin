/* ============================================================================
   ARCHIVOS — comprobantes de pago y facturas
   ----------------------------------------------------------------------------
   Foto desde el celular → se comprime → se guarda.

     · MODO NUBE   →  sube a Supabase Storage, guarda la ruta "uid/archivo.jpg"
     · MODO LOCAL  →  guarda un data URL dentro del propio registro

   Las fotos del celular pesan 3–8 MB. Sin comprimir, en modo local llenan
   el localStorage en cuatro fotos, y en la nube consumen el plan gratis en
   nada. Se reducen a 1600px de lado mayor y JPEG 72%: quedan en 150–400 KB
   y siguen siendo perfectamente legibles para legalizar.
   ========================================================================== */

const BUCKET = 'soportes';
const MAX_LADO = 1600;
const CALIDAD  = 0.72;

/** Comprime una imagen y devuelve un data URL. Los PDF pasan sin tocar. */
function comprimirImagen(file){
  return new Promise((resolve, reject) => {
    if(!file.type.startsWith('image/')){
      // Un PDF no se puede redimensionar: se lee tal cual
      const fr = new FileReader();
      fr.onload = () => resolve({ dataUrl: fr.result, tipo: file.type, nombre: file.name });
      fr.onerror = reject;
      fr.readAsDataURL(file);
      return;
    }

    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width  = Math.round(img.width  * escala);
        c.height = Math.round(img.height * escala);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';                  // sin esto, los PNG con
        ctx.fillRect(0, 0, c.width, c.height);   // transparencia salen negros
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve({ dataUrl: c.toDataURL('image/jpeg', CALIDAD), tipo:'image/jpeg',
                  nombre: (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg' });
      };
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

const dataUrlABlob = d => fetch(d).then(r => r.blob());

/**
 * Guarda un archivo y devuelve la referencia que va en la fila.
 * @returns {string} ruta de Storage, o data URL en modo local
 */
async function guardarArchivo(file){
  const { dataUrl, tipo, nombre } = await comprimirImagen(file);

  if(!NUBE) return dataUrl;

  const ext  = tipo === 'application/pdf' ? 'pdf' : 'jpg';
  const ruta = `${usuario.id}/${uid()}.${ext}`;
  const blob = await dataUrlABlob(dataUrl);

  const { error } = await sb.storage.from(BUCKET)
    .upload(ruta, blob, { contentType: tipo, upsert: false });

  if(error){ toast('No se pudo subir: ' + error.message.slice(0, 50)); return null; }
  return ruta;
}

/** Convierte la referencia guardada en una URL que el navegador pueda mostrar. */
async function urlVisible(ref){
  if(!ref) return null;
  if(ref.startsWith('data:')) return ref;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(ref, 3600);
  if(error){ console.error('Firma:', error.message); return null; }
  return data.signedUrl;
}

/** Borra el archivo de Storage. En modo local basta con soltar la referencia. */
async function borrarArchivo(ref){
  if(!ref || ref.startsWith('data:') || !NUBE) return;
  await sb.storage.from(BUCKET).remove([ref]);
}

const esPDF = ref => !!ref && (ref.startsWith('data:application/pdf') || ref.endsWith('.pdf'));

/* ---- Visor a pantalla completa -------------------------------------------- */

/** Abre la foto en grande, con botón de descarga. */
async function verArchivo(ref, titulo, nombreDescarga){
  const url = await urlVisible(ref);
  if(!url){ toast('No se pudo abrir el archivo'); return; }

  const nombre = (nombreDescarga || titulo || 'soporte')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const cuerpo = esPDF(ref)
    ? `<iframe src="${url}" class="visor-pdf" title="${esc(titulo)}"></iframe>`
    : `<img src="${url}" alt="${esc(titulo)}" class="visor-img">`;

  const v = document.createElement('div');
  v.className = 'visor';
  v.innerHTML = `
    <div class="visor-top">
      <strong>${esc(titulo)}</strong>
      <div style="display:flex;gap:8px">
        <a class="btn sm" href="${url}" download="${nombre}.${esPDF(ref) ? 'pdf' : 'jpg'}"
           target="_blank" rel="noopener">⬇ Descargar</a>
        <button class="btn sm" onclick="this.closest('.visor').remove()">✕ Cerrar</button>
      </div>
    </div>
    ${cuerpo}`;
  v.addEventListener('click', e => { if(e.target === v) v.remove(); });
  document.body.appendChild(v);
}

/* ---- Campo de adjunto en los formularios ---------------------------------- */

/**
 * Campo para tomar la foto o escoger el archivo.
 * Guarda la referencia en el dataset del contenedor; el formulario la lee
 * al guardar. `capture="environment"` abre la cámara trasera en el celular.
 */
function campoArchivo(id, etiqueta, refActual = ''){
  return `
  <div class="adj" id="${id}Box" data-ref="${esc(refActual || '')}">
    <label>${esc(etiqueta)}</label>
    <div class="adj-cuerpo" id="${id}Cuerpo">${adjuntoHTML(id, refActual)}</div>
    <input type="file" id="${id}Input" accept="image/*,application/pdf" capture="environment"
           style="display:none" onchange="tomarArchivo('${id}', this)">
  </div>`;
}

function adjuntoHTML(id, ref){
  if(!ref) return `
    <button type="button" class="adj-btn" onclick="document.getElementById('${id}Input').click()">
      <span class="adj-ico">📷</span>
      <span><strong>Tomar foto o subir archivo</strong>
      <small>Imagen o PDF · se comprime solo</small></span>
    </button>`;

  return `
    <div class="adj-ok">
      <span class="adj-ico">${esPDF(ref) ? '📄' : '🖼️'}</span>
      <span style="flex:1"><strong>Adjunto listo</strong>
      <small>${esPDF(ref) ? 'Documento PDF' : 'Imagen'}</small></span>
      <button type="button" class="btn sm" onclick="verArchivo(document.getElementById('${id}Box').dataset.ref,'Vista previa')">Ver</button>
      <button type="button" class="btn sm dgr" onclick="quitarArchivo('${id}')">✕</button>
    </div>`;
}

async function tomarArchivo(id, input){
  const file = input.files?.[0];
  if(!file) return;

  const cuerpo = document.getElementById(id + 'Cuerpo');
  cuerpo.innerHTML = `<div class="adj-cargando">⏳ Procesando…</div>`;

  try{
    const ref = await guardarArchivo(file);
    if(!ref){ cuerpo.innerHTML = adjuntoHTML(id, ''); return; }
    document.getElementById(id + 'Box').dataset.ref = ref;
    cuerpo.innerHTML = adjuntoHTML(id, ref);
  }catch(e){
    console.error(e);
    toast('No se pudo procesar el archivo');
    cuerpo.innerHTML = adjuntoHTML(id, '');
  }
  input.value = '';   // permite volver a escoger el mismo archivo
}

function quitarArchivo(id){
  document.getElementById(id + 'Box').dataset.ref = '';
  document.getElementById(id + 'Cuerpo').innerHTML = adjuntoHTML(id, '');
}

const refArchivo = id => document.getElementById(id + 'Box')?.dataset.ref || '';
