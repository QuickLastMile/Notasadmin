/* ============================================================================
   CAPA DE DATOS
   ----------------------------------------------------------------------------
   Funciona en dos modos según haya credenciales en CFG.supabase (ver js/nube.js):

     · MODO LOCAL  →  localStorage. Sin cuenta, sin internet, solo este equipo.
     · MODO NUBE   →  Supabase. Multi-dispositivo, con login y archivos.

   En ambos modos S queda actualizado, así que las vistas leen igual y no se
   enteran de nada. Ningún otro archivo cambia al migrar.
   ========================================================================== */

/** Aplica el cambio en el estado local para que la UI responda al instante. */
const _local = {
  insert(tabla, fila){ (S[tabla] ||= []).push(fila); },
  update(tabla, id, fila){
    const i = (S[tabla] || []).findIndex(x => x.id === id);
    if(i >= 0) S[tabla][i] = fila;
  },
  remove(tabla, id){ S[tabla] = (S[tabla] || []).filter(x => x.id !== id); }
};

/** Traduce el error de Postgres a algo que se entienda. */
function _error(accion, error){
  console.error(`${accion}:`, error);
  const m = error.message || '';
  if(m.includes('ux_periodo_abierto'))         toast('Ya tienes un período abierto');
  else if(/campos.*clientes|clientes.*campos|schema cache/i.test(m) && /campos/i.test(m))
                                                toast('Falta actualizar la tabla clientes en Supabase');
  else if(/notas|notas_carpetas/i.test(m) && /schema cache|does not exist|not found/i.test(m))
                                                toast('Activa Notas ejecutando sql/23-notas.sql en Supabase');
  else if(m.includes('reembolso_no_supera'))   toast('El reembolso no puede superar el monto');
  else if(m.includes('duplicate key'))         toast('Ese registro ya existe');
  else if(m.includes('JWT') || m.includes('session')) toast('Tu sesión expiró — vuelve a entrar');
  else toast('No se pudo guardar: ' + m.slice(0, 60));
  return null;
}

const db = {

  /** Lee filas de una tabla. `filtro` es un objeto {campo: valor}. */
  async list(tabla, filtro = {}){
    let filas = S[tabla] || [];
    for(const k in filtro) filas = filas.filter(x => x[k] === filtro[k]);
    return filas;
  },

  /** Inserta una fila y devuelve la fila creada (con id). */
  async insert(tabla, fila){
    if(NUBE){
      const { data, error } = await sb.from(tabla).insert(fila).select().single();
      if(error) return _error(`insert ${tabla}`, error);
      _local.insert(tabla, data);
      return data;
    }
    fila.id = fila.id || uid();
    fila.created_at = new Date().toISOString();
    _local.insert(tabla, fila);
    save();
    return fila;
  },

  /** Actualiza campos de una fila por id. */
  async update(tabla, id, cambios){
    if(NUBE){
      const { data, error } = await sb.from(tabla).update(cambios).eq('id', id).select().single();
      if(error) return _error(`update ${tabla}`, error);
      _local.update(tabla, id, data);
      return data;
    }
    const fila = (S[tabla] || []).find(x => x.id === id);
    if(!fila) return null;
    Object.assign(fila, cambios, { updated_at: new Date().toISOString() });
    save();
    return fila;
  },

  /** Elimina una fila por id. */
  async remove(tabla, id){
    if(NUBE){
      const { error } = await sb.from(tabla).delete().eq('id', id);
      if(error) return _error(`delete ${tabla}`, error);
    }
    _local.remove(tabla, id);
    if(!NUBE) save();
  }
};
