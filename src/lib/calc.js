// Fechas como 'YYYY-MM-DD'; se comparan en UTC para evitar errores de zona horaria.
const ms = iso => new Date(iso + 'T00:00:00Z').getTime()

export const diasRestantes = (limite, hoy) =>
  limite ? Math.round((ms(limite) - ms(hoy)) / 864e5) : null

export function semaforo(a, hoy) {
  if (a.estado === 'cumplida') return 'completado'
  if (a.estado === 'cumplida_tarde') return 'tarde'
  if (a.estado === 'no_cumplida') return 'incumplido'
  const d = diasRestantes(a.limite, hoy)
  if (d === null) return 'sin_fecha'
  if (d < 0) return 'vencido'
  if (d <= 2) return 'por_vencer'
  return 'en_plazo'
}

export const ETIQUETA = {
  completado: 'Cumplida', tarde: 'Cumplida tarde', incumplido: 'No cumplida',
  sin_fecha: 'Sin fecha', vencido: 'Vencida', por_vencer: 'Por vencer', en_plazo: 'En plazo',
}
