const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const monthOf = (iso: string): string => iso.slice(0, 7)
export function addMonths(m: string, n: number): string {
  const [y, mo] = m.split('-').map(Number)
  const t = y * 12 + (mo - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}
export function daysInMonth(m: string): number {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo, 0).getDate()
}
export const dateInMonth = (m: string, day: number): string => `${m}-${pad(Math.max(1, Math.min(day, daysInMonth(m))))}`
export const formatDate = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
export const formatDateFull = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
export const monthName = (m: string): string => MONTHS[Number(m.slice(5, 7)) - 1]
export const formatMonth = (m: string): string => `${monthName(m)} ${m.slice(0, 4)}`
export function monthRange(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(from, i))
}
