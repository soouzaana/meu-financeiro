const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
/** Todos os valores do app são inteiros em centavos. */
export const formatMoney = (cents: number): string => fmt.format(cents / 100)

export function parseMoney(input: string): number {
  let s = input.trim().replace(/[R$\s]/g, '')
  if (!s) return 0
  let neg = false
  if (s.startsWith('-')) { neg = true; s = s.slice(1) }
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const [i, f = ''] = s.split('.')
  const int = parseInt(i || '0', 10)
  const frac = parseInt((f + '00').slice(0, 2), 10)
  if (Number.isNaN(int) || Number.isNaN(frac)) return 0
  const v = int * 100 + frac
  return neg ? -v : v
}

export function splitEven(total: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(total / n)
  const rest = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}

/** Distribui `total` proporcionalmente a `weights` sem perder nenhum centavo (maiores restos). */
export function allocate(total: number, weights: number[]): number[] {
  const n = weights.length
  if (!n) return []
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return splitEven(total, n)
  const T = BigInt(total), S = BigInt(sum)
  const out = weights.map((w) => Number((T * BigInt(w)) / S))
  const rem = weights.map((w, i) => ({ i, r: Number((T * BigInt(w)) % S) }))
  let left = total - out.reduce((a, b) => a + b, 0)
  rem.sort((a, b) => b.r - a.r || a.i - b.i)
  for (let k = 0; left > 0; k++, left--) out[rem[k % n].i]++
  return out
}

export const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0)
