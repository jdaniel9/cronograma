import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { diasRestantes, semaforo, ETIQUETA } from './lib/calc'

const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })

function Login() {
  const [email, setEmail] = useState(''), [pass, setPass] = useState(''), [err, setErr] = useState('')
  const entrar = async e => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setErr('Correo o contraseña incorrectos.')
  }
  return (
    <form className="login" onSubmit={entrar}>
      <h1>Cronograma de supervisión</h1>
      <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Contraseña<input type="password" value={pass} onChange={e => setPass(e.target.value)} required /></label>
      {err && <p role="alert" className="err">{err}</p>}
      <button className="primario">Entrar</button>
    </form>
  )
}

function MiCronograma({ perfil }) {
  const esJefe = perfil.rol === 'jefatura'
  const [supers, setSupers] = useState([])
  const [sel, setSel] = useState(perfil.id)
  const [mes, setMes] = useState(hoyISO().slice(0, 7))
  const [clase, setClase] = useState('administrativa')
  const [acts, setActs] = useState([])
  const hoy = hoyISO()

  useEffect(() => {
    if (esJefe) supabase.from('perfiles').select('id,nombre').eq('rol', 'supervisor').order('nombre')
      .then(({ data }) => { setSupers(data || []); if (data?.length) setSel(data[0].id) })
  }, [esJefe])

  const cargar = () => supabase.from('actividades')
    .select('*, proyectos(nombre), departamentos(nombre)')
    .eq('responsable_id', sel).order('limite')
    .then(({ data }) => setActs(data || []))
  useEffect(() => { cargar() }, [sel])

  const visibles = useMemo(() => acts.filter(a => a.clase === clase && (a.limite || '').startsWith(mes)), [acts, clase, mes])
  const conteo = useMemo(() => {
    const c = { vencido: 0, por_vencer: 0, en_plazo: 0, completado: 0 }
    acts.filter(a => (a.limite || '').startsWith(mes)).forEach(a => { const s = semaforo(a, hoy); if (c[s] !== undefined) c[s]++ })
    return c
  }, [acts, mes, hoy])

  const cambiar = async (a, estado) => {
    let motivo = a.motivo
    if (estado === 'cumplida_tarde' || estado === 'no_cumplida') {
      motivo = window.prompt('¿Por qué? (obligatorio)')
      if (!motivo) return
    }
    const fin = ['cumplida', 'cumplida_tarde'].includes(estado)
    await supabase.from('actividades').update({
      estado, motivo, fecha_real: fin ? hoy : null, avance: fin ? 100 : a.avance,
    }).eq('id', a.id)
    cargar()
  }

  return (
    <main>
      <div className="filtros">
        {esJefe && (
          <label>Supervisor
            <select value={sel} onChange={e => setSel(e.target.value)}>
              {supers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
        )}
        <label>Mes<input type="month" value={mes} onChange={e => setMes(e.target.value)} /></label>
      </div>

      <div className="resumen">
        <span className="chip vencido">{conteo.vencido} vencidas</span>
        <span className="chip por_vencer">{conteo.por_vencer} por vencer</span>
        <span className="chip en_plazo">{conteo.en_plazo} en plazo</span>
        <span className="chip completado">{conteo.completado} cumplidas</span>
      </div>

      <div className="tabs" role="tablist">
        {['administrativa', 'operativa'].map(c => (
          <button key={c} role="tab" aria-selected={clase === c} onClick={() => setClase(c)}>
            {c === 'administrativa' ? 'Administrativas' : 'Operativas'}
          </button>
        ))}
      </div>

      {visibles.length === 0 && <p className="vacio">No hay actividades {clase === 'administrativa' ? 'administrativas' : 'operativas'} este mes.</p>}
      <ul className="lista">
        {visibles.map(a => {
          const s = semaforo(a, hoy), d = diasRestantes(a.limite, hoy)
          return (
            <li key={a.id} className={`act ${s}`}>
              <div>
                <strong>{a.titulo}</strong>
                <span className="meta">{a.proyectos?.nombre}{a.departamentos?.nombre ? ` · pide ${a.departamentos.nombre}` : ''}</span>
                {a.motivo && <span className="meta">Motivo: {a.motivo}</span>}
              </div>
              <div className="der">
                <span className={`chip ${s}`}>{ETIQUETA[s]}{['en_plazo', 'por_vencer', 'vencido'].includes(s) && d !== null ? ` (${d >= 0 ? d + ' d' : 'hace ' + -d + ' d'})` : ''}</span>
                <span className="meta">Límite {a.limite || 'sin fecha'}</span>
                <select aria-label="Estado" value={a.estado} onChange={e => cambiar(a, e.target.value)}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="cumplida">Cumplida</option>
                  <option value="cumplida_tarde">Cumplida tarde</option>
                  <option value="no_cumplida">No cumplida</option>
                </select>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

export default function App() {
  const [sesion, setSesion] = useState(undefined), [perfil, setPerfil] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!sesion) return setPerfil(null)
    supabase.from('perfiles').select('*').eq('id', sesion.user.id).single().then(({ data }) => setPerfil(data))
  }, [sesion])

  if (sesion === undefined) return null
  if (!sesion) return <Login />
  if (!perfil) return <p className="vacio">Tu usuario no tiene perfil asignado. Pide a jefatura que lo cree.</p>
  return (
    <>
      <header>
        <h1>Cronograma · {perfil.nombre}</h1>
        <button onClick={() => supabase.auth.signOut()}>Salir</button>
      </header>
      {perfil.rol === 'solicitante'
        ? <p className="vacio">El módulo de solicitudes estará disponible pronto.</p>
        : <MiCronograma perfil={perfil} />}
    </>
  )
}
