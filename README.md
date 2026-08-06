# 🎯 Hub Personal

Centro de control diario para trabajo operativo: **tareas, caja menor, novedades, proyectos, clientes y dashboards** en una sola página.

Pensado para mitigar las novedades del día a día: nada se queda en la memoria, todo queda capturado y con una alerta que lo persigue.

---

## Cómo usarlo

Abre `index.html` en el navegador. No necesita servidor, ni instalación, ni internet.

### ⚡ Captura rápida

La barra de arriba es el corazón de la app. Tecla `/` la enfoca desde cualquier parte.

| Prefijo | Crea | Ejemplo |
|---|---|---|
| `t:` | Tarea | `t: enviar informe a Diebold viernes !alta` |
| `g:` | Gasto de caja menor | `g: 45000 taxi a bodega @Cafam` |
| `i:` | Ingreso a caja menor | `i: 600000 base del mes` |
| `n:` | Novedad | `n: falla el dashboard de ausencias @Cafam !alta` |
| `l:` | Enlace / dashboard | `l: https://... Informe mensual` |
| `p:` | Proyecto | `p: Nuevo tablero de indicadores @Alfagres` |

**Modificadores** (en cualquier orden, dentro del mismo texto):

- `@cliente` — imputa al cliente (basta el prefijo: `@Cafa`, `@Die`)
- `!alta` `!media` `!baja` — prioridad o criticidad
- `$45000` o simplemente `45000` en gastos — monto
- `hoy` · `mañana` · `viernes` · `+3d` — fecha de vencimiento

Antes de pulsar Enter, un panel muestra exactamente lo que se va a crear.

---

## Estructura

```
index.html              Cascarón: sidebar, barra de captura, contenedor
css/styles.css          Todo el diseño (cambia los tokens de :root y cambia la app)
sql/supabase-schema.sql Esquema listo para pegar en Supabase (tablas + RLS + Storage)

js/
  config.js       Parámetros: clave de storage, tope de alerta de caja, credenciales
  utils.js        Helpers puros: fechas, dinero, escape de HTML, toast
  db.js           ⭐ CAPA DE DATOS — el único archivo que cambia al migrar a Supabase
  seed.js         Datos de ejemplo (desaparece al conectar la nube)
  store.js        Estado global `S` + `metricas()`: la fuente de todas las alertas
  ui.js           Piezas visuales compartidas: modal, KPI, chips, fila de tarea
  capture.js      Parser de la captura rápida
  acciones.js     Todo lo que modifica datos + los formularios modales
  app.js          Menú, enrutado, tema, atajos, arranque

  views/          Una vista por módulo — se editan sin tocar las demás
    inicio.js  tareas.js  caja.js  novedades.js
    proyectos.js  clientes.js  enlaces.js
```

**Regla de oro:** las vistas solo dibujan. Cualquier cambio de datos pasa por `acciones.js`, que a su vez solo habla con `db.js`.

### Agregar un módulo nuevo

1. Crea `js/views/mimodulo.js` con una función `vMiModulo(m)` que devuelva HTML.
2. Añade el `<script>` en `index.html`.
3. Añade una línea al array `MENU` en `js/app.js`.

---

## Migrar a Supabase

1. Crea el proyecto en [supabase.com](https://supabase.com) (plan gratuito alcanza de sobra).
2. SQL Editor → pega `sql/supabase-schema.sql` → Run.
3. Llena `CFG.supabase` en `js/config.js` con la URL y la **anon key**.
4. Agrega en `index.html`, antes de `js/db.js`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
5. Reemplaza el cuerpo de los 4 métodos de `js/db.js` por lo que está comentado dentro.

Ningún otro archivo se toca.

> La **anon key** es pública por diseño: puede ir al repo sin problema. Quien protege los datos es **RLS** (`auth.uid() = user_id`), que ya viene activo en todas las tablas del esquema. La clave `service_role` **nunca** va al frontend.

---

## Publicar en GitHub Pages

Settings → Pages → Branch `main` / carpeta `/ (root)` → Save.

---

## Estado

| Módulo | Estado |
|---|---|
| Captura rápida | ✅ Funcionando |
| Inicio (alertas, foco, rutina) | ✅ Funcionando |
| Tareas | ✅ Funcionando |
| Caja menor | ✅ Funcionando |
| Novedades | ✅ Funcionando |
| Proyectos | ✅ Vista de solo lectura — falta editar |
| Clientes | ✅ Vista de solo lectura — falta editar |
| Dashboards | ✅ Funcionando |
| Supabase | ⏳ Pendiente |
| Fotos de soportes | ⏳ Pendiente (requiere Supabase Storage) |
