/* ============================================================================
   NUBE — conexión con Supabase
   ----------------------------------------------------------------------------
   La app funciona en dos modos y decide sola cuál usar:

     · Sin credenciales en CFG.supabase  →  MODO LOCAL (localStorage)
     · Con credenciales                  →  MODO NUBE  (Supabase + login)

   Mientras CFG.supabase esté vacío, este archivo no hace absolutamente nada.
   ========================================================================== */

const NUBE = !!(CFG.supabase.url && CFG.supabase.anonKey);

let sb = null;      // cliente de supabase-js
let usuario = null; // sesión activa

if(NUBE){
  if(typeof supabase === 'undefined')
    console.error('Falta el script de supabase-js en index.html');
  else
    sb = supabase.createClient(CFG.supabase.url, CFG.supabase.anonKey);
}

/* ---- Sesión -------------------------------------------------------------- */
async function sesionActual(){
  if(!sb) return null;
  const { data } = await sb.auth.getSession();
  usuario = data.session?.user || null;
  return usuario;
}

const RETORNO = () => location.origin + location.pathname;

/* Los mensajes de Supabase vienen en inglés y son crípticos. */
const ERRORES = {
  'Invalid login credentials':'Correo o contraseña incorrectos',
  'Email not confirmed':'Falta confirmar tu correo. Revisa la bandeja de entrada.',
  'User already registered':'Ese correo ya tiene cuenta. Entra con tu contraseña.',
  'Password should be at least 6 characters':'La contraseña debe tener al menos 6 caracteres',
  'Unable to validate email address: invalid format':'Ese correo no parece válido',
  'For security purposes, you can only request this after':'Espera unos segundos antes de volver a intentar'
};
const traducir = m => Object.entries(ERRORES)
  .find(([en]) => (m || '').includes(en))?.[1] || m;

const conBoton = async (id, texto, fn) => {
  const b = $('#' + id); const original = b.innerHTML;
  b.disabled = true; b.innerHTML = texto;
  try{ await fn(); } finally { if(document.getElementById(id)){ b.disabled = false; b.innerHTML = original; } }
};

/* ---- Entrar con Google --------------------------------------------------- */
async function entrarGoogle(){
  const { error } = await sb.auth.signInWithOAuth({
    provider:'google',
    options:{ redirectTo: RETORNO() }
  });
  if(error) mostrarErrorLogin(traducir(error.message));
}

/* ---- Entrar con correo y contraseña -------------------------------------- */
async function entrarPassword(){
  const email = $('#loginMail').value.trim();
  const pass  = $('#loginPass').value;
  if(!email || !pass){ mostrarErrorLogin('Escribe tu correo y tu contraseña'); return; }

  await conBoton('loginBtn', 'Entrando…', async () => {
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error) mostrarErrorLogin(traducir(error.message));
    else location.reload();
  });
}

/* ---- Crear cuenta -------------------------------------------------------- */
async function crearCuenta(){
  const email = $('#regMail').value.trim();
  const pass  = $('#regPass').value;
  const pass2 = $('#regPass2').value;

  if(!email || !pass){ mostrarErrorLogin('Completa correo y contraseña'); return; }
  if(pass.length < 6){ mostrarErrorLogin('La contraseña debe tener al menos 6 caracteres'); return; }
  if(pass !== pass2){ mostrarErrorLogin('Las dos contraseñas no coinciden'); return; }

  await conBoton('loginBtn', 'Creando…', async () => {
    const { data, error } = await sb.auth.signUp({
      email, password: pass, options:{ emailRedirectTo: RETORNO() }
    });
    if(error){ mostrarErrorLogin(traducir(error.message)); return; }

    // Si el proyecto exige confirmar el correo, no hay sesión todavía
    if(data.session) location.reload();
    else avisoCorreo('Confirma tu cuenta', email,
      'Te enviamos un correo para activar la cuenta. Ábrelo y vuelve a entrar.');
  });
}

/* ---- Recuperar contraseña — aquí sí va el enlace al correo ---------------- */
async function recuperarPassword(){
  const email = $('#recMail').value.trim();
  if(!email){ mostrarErrorLogin('Escribe tu correo'); return; }

  await conBoton('loginBtn', 'Enviando…', async () => {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: RETORNO() + '#recuperar'
    });
    if(error){ mostrarErrorLogin(traducir(error.message)); return; }
    avisoCorreo('Revisa tu correo', email,
      'Te enviamos un enlace para crear una contraseña nueva. Ábrelo desde este dispositivo.');
  });
}

/* ---- Cambiar la contraseña (tras abrir el enlace de recuperación) --------- */
async function guardarPasswordNueva(){
  const pass  = $('#nuevaPass').value;
  const pass2 = $('#nuevaPass2').value;
  if(pass.length < 6){ mostrarErrorLogin('Mínimo 6 caracteres'); return; }
  if(pass !== pass2){ mostrarErrorLogin('Las dos contraseñas no coinciden'); return; }

  await conBoton('loginBtn', 'Guardando…', async () => {
    const { error } = await sb.auth.updateUser({ password: pass });
    if(error){ mostrarErrorLogin(traducir(error.message)); return; }
    toast('Contraseña actualizada ✓');
    location.href = RETORNO();
  });
}

function avisoCorreo(titulo, email, texto){
  $('#loginCard').innerHTML = `
    <div style="text-align:center;padding:14px 4px">
      <div style="font-size:46px;margin-bottom:14px">📬</div>
      <h2>${esc(titulo)}</h2>
      <p style="margin-top:8px">Enviado a<br><strong style="color:#fff">${esc(email)}</strong></p>
      <p style="margin-top:14px;font-size:12.5px">${esc(texto)}<br>Si no llega en un minuto, mira en spam.</p>
      <button class="glass-btn" onclick="location.href='${RETORNO()}'" style="margin-top:22px">Volver</button>
    </div>`;
}

async function salir(){
  await sb.auth.signOut();
  location.reload();
}

const mostrarErrorLogin = msg => {
  const e = $('#loginErr');
  e.textContent = msg;
  e.style.display = 'block';
};

/* ---- Pantalla de acceso — vidrio esmerilado sobre cabernet ---------------- */

const cabecera = () => `
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px">
    <div class="glass-logo">${logoNexa(30,'lg')}</div>
    <div>
      <strong style="font-size:19px;display:block;letter-spacing:.5px">NEXA</strong>
      <span style="font-size:10px;color:rgba(255,255,255,.6);
            text-transform:uppercase;letter-spacing:2px">Centro de Gestión</span>
    </div>
  </div>`;

const BTN_GOOGLE = `
  <button class="google-btn" onclick="entrarGoogle()">
    <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4z"/>
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
    Continuar con Google
  </button>
  <div class="sep-o"><span>o con tu correo</span></div>`;

function pantalla(html){
  document.body.innerHTML = `
    <div class="login-bg"><div class="glass" id="loginCard">${cabecera()}${html}</div></div>
    <div class="toast" id="toast"></div>`;
}

/** Entrada normal: Google o correo + contraseña. */
function mostrarLogin(){
  pantalla(`
    <h2>Bienvenida 👋</h2>
    <p style="margin-bottom:20px">Entra para ver tu centro de control.</p>

    ${BTN_GOOGLE}

    <label for="loginMail">Correo</label>
    <input id="loginMail" type="email" inputmode="email" autocomplete="email"
           placeholder="tucorreo@gmail.com">

    <label for="loginPass" style="margin-top:14px">Contraseña</label>
    <input id="loginPass" type="password" autocomplete="current-password"
           placeholder="••••••••" onkeydown="if(event.key==='Enter')entrarPassword()">

    <div id="loginErr" class="glass-err" style="display:none"></div>

    <button class="glass-btn" id="loginBtn" onclick="entrarPassword()">Entrar</button>

    <div class="glass-links">
      <button onclick="mostrarRecuperar()">¿Olvidaste tu contraseña?</button>
      <button onclick="mostrarRegistro()">Crear cuenta</button>
    </div>`);
  setTimeout(() => $('#loginMail')?.focus(), 80);
}

function mostrarRegistro(){
  pantalla(`
    <h2>Crear cuenta</h2>
    <p style="margin-bottom:20px">Con tu correo y una contraseña de al menos 6 caracteres.</p>

    ${BTN_GOOGLE}

    <label for="regMail">Correo</label>
    <input id="regMail" type="email" inputmode="email" autocomplete="email"
           placeholder="tucorreo@gmail.com">

    <label for="regPass" style="margin-top:14px">Contraseña</label>
    <input id="regPass" type="password" autocomplete="new-password" placeholder="••••••••">

    <label for="regPass2" style="margin-top:14px">Repite la contraseña</label>
    <input id="regPass2" type="password" autocomplete="new-password" placeholder="••••••••"
           onkeydown="if(event.key==='Enter')crearCuenta()">

    <div id="loginErr" class="glass-err" style="display:none"></div>

    <button class="glass-btn" id="loginBtn" onclick="crearCuenta()">Crear cuenta</button>

    <div class="glass-links"><button onclick="mostrarLogin()">← Ya tengo cuenta</button></div>`);
  setTimeout(() => $('#regMail')?.focus(), 80);
}

function mostrarRecuperar(){
  pantalla(`
    <h2>Recuperar contraseña</h2>
    <p style="margin-bottom:20px">
      Te enviamos un enlace al correo para que crees una nueva.
    </p>

    <label for="recMail">Correo</label>
    <input id="recMail" type="email" inputmode="email" autocomplete="email"
           placeholder="tucorreo@gmail.com" onkeydown="if(event.key==='Enter')recuperarPassword()">

    <div id="loginErr" class="glass-err" style="display:none"></div>

    <button class="glass-btn" id="loginBtn" onclick="recuperarPassword()">Enviar enlace</button>

    <div class="glass-links"><button onclick="mostrarLogin()">← Volver</button></div>`);
  setTimeout(() => $('#recMail')?.focus(), 80);
}

/** Se muestra al volver del enlace de recuperación. */
function mostrarNuevaPassword(){
  pantalla(`
    <h2>Nueva contraseña</h2>
    <p style="margin-bottom:20px">Escríbela dos veces para confirmar.</p>

    <label for="nuevaPass">Contraseña</label>
    <input id="nuevaPass" type="password" autocomplete="new-password" placeholder="••••••••">

    <label for="nuevaPass2" style="margin-top:14px">Repite la contraseña</label>
    <input id="nuevaPass2" type="password" autocomplete="new-password" placeholder="••••••••"
           onkeydown="if(event.key==='Enter')guardarPasswordNueva()">

    <div id="loginErr" class="glass-err" style="display:none"></div>

    <button class="glass-btn" id="loginBtn" onclick="guardarPasswordNueva()">Guardar</button>`);
  setTimeout(() => $('#nuevaPass')?.focus(), 80);
}

/* ---- Carga inicial ------------------------------------------------------- */
/**
 * Trae todas las tablas de una vez y las deja en S.
 * A partir de ahí las vistas siguen leyendo S de forma síncrona, igual que en
 * modo local: db.insert/update/remove escriben en Supabase Y actualizan S.
 */
async function cargarNube(){
  const resultados = await Promise.all(
    COLECCIONES.map(t => sb.from(t).select('*'))
  );

  // Si faltan tablas es que no se corrió sql/supabase-schema.sql.
  // Mejor decirlo que mostrar una app vacía sin explicación.
  const faltantes = resultados
    .map((r, i) => (r.error?.code === 'PGRST205' || /does not exist|schema cache/i.test(r.error?.message || ''))
                    ? COLECCIONES[i] : null)
    .filter(Boolean);
  if(faltantes.length){ mostrarFaltaEsquema(faltantes); return false; }

  S = {};
  resultados.forEach((r, i) => {
    const tabla = COLECCIONES[i];
    if(r.error){ console.error(`Error leyendo ${tabla}:`, r.error.message); S[tabla] = []; }
    else S[tabla] = r.data || [];
  });

  S = normalizar(S);

  // Orden estable: lo más nuevo primero donde importa
  S.rutina.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  S.periodos.sort((a, b) => a.inicio < b.inicio ? -1 : 1);
  return true;
}

/** Pantalla de "falta correr el esquema", con los pasos exactos. */
function mostrarFaltaEsquema(faltantes){
  const proyecto = CFG.supabase.url.replace('https://', '').split('.')[0];
  document.body.innerHTML = `
  <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg)">
    <div class="card" style="max-width:560px;width:100%">
      <div class="card-b" style="padding:28px 24px">
        <div style="font-size:34px;margin-bottom:10px">🗄️</div>
        <h2 style="font-size:17px;margin-bottom:6px">Falta crear las tablas en Supabase</h2>
        <p style="color:var(--text-2);font-size:13px;margin-bottom:18px">
          El proyecto responde bien, pero la base todavía está vacía.
          Faltan ${faltantes.length} tablas: <code>${faltantes.join('</code>, <code>')}</code>
        </p>

        <div style="display:grid;gap:12px;font-size:13px">
          <div><strong>1.</strong> Abre
            <a href="https://supabase.com/dashboard/project/${proyecto}/sql/new"
               target="_blank" rel="noopener" style="color:var(--brand)">el SQL Editor de tu proyecto ↗</a></div>
          <div><strong>2.</strong> Pega todo el contenido de <code>sql/supabase-schema.sql</code></div>
          <div><strong>3.</strong> Pulsa <strong>Run</strong></div>
          <div><strong>4.</strong> Vuelve aquí y recarga</div>
        </div>

        <button class="btn pri" onclick="location.reload()"
                style="width:100%;margin-top:20px;padding:10px">Ya lo hice — recargar</button>

        <p style="color:var(--text-3);font-size:11.5px;margin-top:14px;text-align:center">
          Mientras tanto tus datos locales siguen intactos en este navegador.
        </p>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>`;
}

/** Borra todo lo del usuario en la nube (lo llama vaciarTodo en modo nube). */
async function vaciarNube(){
  // En orden inverso a las dependencias, para no chocar con las llaves foráneas
  const orden = ['caja','tareas','novedades','dashboards','rutina','presupuestos',
                 'listas','preguntas','periodos','proyectos','beneficiarios','clientes'];
  for(const t of orden){
    const { error } = await sb.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if(error) console.error(`Error vaciando ${t}:`, error.message);
  }
  await cargarNube();
}
