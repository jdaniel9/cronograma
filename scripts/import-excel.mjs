// Uso: npm run import -- ruta/al/Excel.xlsx
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const wb = XLSX.readFile(process.argv[2])

const filas = (hoja, clave) => {
  const a = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: null })
  const h = a.findIndex(r => r?.includes(clave))
  return a.slice(h + 1).filter(r => r[0]).map(r => Object.fromEntries(a[h].map((c, i) => [c, r[i]])))
}
// Serial de Excel -> YYYY-MM-DD. Fuera de rango (ej. 51136) = dato erróneo -> null
const fecha = (s, ref) => {
  if (typeof s !== 'number') return null
  if (s < 40000 || s > 60000) { console.warn('Fecha inválida en', ref, s); return null }
  return new Date(Math.round((s - 25569) * 864e5)).toISOString().slice(0, 10)
}
const por = (arr, k) => Object.fromEntries(arr.map(x => [x[k].toUpperCase(), x]))

const { data: perf, error: ePerf } = await sb.from('perfiles').select('id,nombre')
if (ePerf) { console.error('Error leyendo perfiles:', ePerf.message); process.exit(1) }
const personas = por(perf, 'nombre')
const idPersona = n => personas[(n || '').toUpperCase()]?.id ?? null

const proy = filas('PROYECTOS', 'Proyecto').map(r => ({
  nombre: r['Proyecto'], estado: r['Estado'],
  supervisor_id: idPersona(r['Supervisor principal']), apoyo_id: idPersona(r['Supervisor de apoyo']),
  observaciones: r['Observaciones'],
}))
let { error } = await sb.from('proyectos').upsert(proy, { onConflict: 'nombre' }); if (error) throw error

const { data: pr } = await sb.from('proyectos').select('id,nombre'); const proyectos = por(pr, 'nombre')
const { data: ti } = await sb.from('tipos_actividad').select('id,nombre,clase'); const tipos = por(ti, 'nombre')

const acts = filas('ACTIVIDADES', 'Código EDT').map(r => {
  const t = tipos[(r['Tipo'] || '').toUpperCase()]
  const limite = fecha(r['Entrega límite'], r['Código EDT'])
  const real = fecha(r['Fecha entrega real'], r['Código EDT'])
  let estado = r['Estado'] === 'Cerrado' ? 'cumplida' : 'pendiente'
  if (estado === 'cumplida' && real && limite && real > limite) estado = 'cumplida_tarde'
  return {
    codigo: String(r['Código EDT']), proyecto_id: proyectos[(r['Proyecto'] || '').toUpperCase()]?.id,
    tipo_id: t?.id, clase: t?.clase, titulo: r['Actividad / entregable'], origen: 'recurrente',
    responsable_id: idPersona(r['Responsable']), inicio: fecha(r['Inicio planificado'], r['Código EDT']),
    limite, fecha_real: real, estado, observaciones: r['Observaciones'],
  }
}).filter(a => a.tipo_id)
;({ error } = await sb.from('actividades').upsert(acts, { onConflict: 'codigo' })); if (error) throw error
console.log(`OK: ${proy.length} proyectos, ${acts.length} actividades`)
