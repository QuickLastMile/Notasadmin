/* ============================================================================
   CAPA DE DATOS
   ----------------------------------------------------------------------------
   Este es el ÚNICO archivo que cambia cuando pasemos a Supabase.
   Todas las funciones ya son async, así que ningún otro módulo se entera.

   Hoy      →  localStorage  (sirve sin internet, sin cuenta, sin nada)
   Mañana   →  Supabase      (multi-dispositivo, con login y archivos)

   Para migrar: llena CFG.supabase en js/config.js, agrega en index.html
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   y reemplaza el cuerpo de los 4 métodos por lo comentado abajo.
   ========================================================================== */

const db = {

  /** Lee filas de una tabla. `filtro` es un objeto {campo: valor}. */
  async list(tabla, filtro = {}){
    // SUPABASE:
    // let q = sb.from(tabla).select('*');
    // for (const k in filtro) q = q.eq(k, filtro[k]);
    // const { data, error } = await q;
    // if (error) throw error; return data;
    let filas = S[tabla] || [];
    for(const k in filtro) filas = filas.filter(x => x[k] === filtro[k]);
    return filas;
  },

  /** Inserta una fila y devuelve la fila creada (con id). */
  async insert(tabla, fila){
    // SUPABASE:
    // const { data, error } = await sb.from(tabla).insert(fila).select().single();
    // if (error) throw error; return data;
    fila.id = fila.id || uid();
    fila.created_at = new Date().toISOString();
    (S[tabla] ||= []).push(fila);
    save();
    return fila;
  },

  /** Actualiza campos de una fila por id. */
  async update(tabla, id, cambios){
    // SUPABASE:
    // const { data, error } = await sb.from(tabla).update(cambios).eq('id', id).select().single();
    // if (error) throw error; return data;
    const fila = (S[tabla] || []).find(x => x.id === id);
    if(!fila) return null;
    Object.assign(fila, cambios, { updated_at: new Date().toISOString() });
    save();
    return fila;
  },

  /** Elimina una fila por id. */
  async remove(tabla, id){
    // SUPABASE:
    // const { error } = await sb.from(tabla).delete().eq('id', id);
    // if (error) throw error;
    S[tabla] = (S[tabla] || []).filter(x => x.id !== id);
    save();
  }
};
