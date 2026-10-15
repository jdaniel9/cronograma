import { describe, it, expect } from 'vitest'
import { diasRestantes, semaforo } from './calc'

describe('diasRestantes', () => {
  it('cuenta días hasta el límite', () => expect(diasRestantes('2026-10-20', '2026-10-15')).toBe(5))
  it('es negativo si ya pasó', () => expect(diasRestantes('2026-10-10', '2026-10-15')).toBe(-5))
  it('sin límite devuelve null', () => expect(diasRestantes(null, '2026-10-15')).toBeNull())
  it('cruza fin de mes', () => expect(diasRestantes('2026-11-02', '2026-10-30')).toBe(3))
})

describe('semaforo', () => {
  const hoy = '2026-10-15'
  it('vencida', () => expect(semaforo({ estado: 'pendiente', limite: '2026-10-14' }, hoy)).toBe('vencido'))
  it('por vencer (<=2 días)', () => expect(semaforo({ estado: 'pendiente', limite: '2026-10-17' }, hoy)).toBe('por_vencer'))
  it('en plazo', () => expect(semaforo({ estado: 'pendiente', limite: '2026-10-25' }, hoy)).toBe('en_plazo'))
  it('cumplida ignora la fecha', () => expect(semaforo({ estado: 'cumplida', limite: '2026-10-01' }, hoy)).toBe('completado'))
  it('sin fecha', () => expect(semaforo({ estado: 'pendiente', limite: null }, hoy)).toBe('sin_fecha'))
})
