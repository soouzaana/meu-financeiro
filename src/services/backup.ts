import type { AppData } from '@/types'
import { BACKUP_KEYS, LIST_TABLES, type ListKey } from '@/db'
import { emptyData } from './seed'
import { sum } from '@/utils/money'

type Kind = 'string' | 'int' | 'array'
const REQUIRED: Record<string, [string, Kind][]> = {
  people: [['id', 'string'], ['name', 'string']],
  cards: [['id', 'string'], ['closingDay', 'int'], ['dueDay', 'int']],
  invoices: [['id', 'string'], ['month', 'string']],
  transactions: [['id', 'string'], ['description', 'string'], ['totalAmount', 'int'], ['splits', 'array']],
  installments: [['id', 'string'], ['transactionId', 'string'], ['invoiceMonth', 'string'], ['amount', 'int'], ['splits', 'array']],
  payments: [['id', 'string'], ['invoiceId', 'string'], ['amount', 'int']],
  categories: [['id', 'string'], ['name', 'string']],
  reserves: [['id', 'string'], ['name', 'string']],
  reserveMovements: [['id', 'string'], ['reserveId', 'string'], ['type', 'string'], ['amount', 'int']],
  income: [['id', 'string'], ['description', 'string'], ['amount', 'int'], ['date', 'string']],
  expenses: [['id', 'string'], ['description', 'string'], ['amount', 'int']],
  accounts: [['id', 'string'], ['name', 'string'], ['amount', 'int'], ['dueDay', 'int']],
  loans: [['id', 'string'], ['personName', 'string'], ['amount', 'int']],
  loanPayments: [['id', 'string'], ['loanId', 'string'], ['amount', 'int']],
}

export function validateBackup(data: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['Arquivo não é um backup válido.'] }
  const obj = data as Record<string, unknown>
  const keys = Object.values(BACKUP_KEYS)
  if (!keys.some((k) => k in obj)) errors.push('Nenhuma tabela conhecida encontrada no arquivo.')
  for (const key of keys) {
    if (!(key in obj)) continue
    const list = obj[key]
    if (!Array.isArray(list)) { errors.push(`"${key}" deve ser uma lista.`); continue }
    list.forEach((item, idx) => {
      if (!item || typeof item !== 'object') { errors.push(`${key}[${idx}] inválido.`); return }
      const rec = item as Record<string, unknown>
      for (const [f, kind] of REQUIRED[key]) {
        const v = rec[f]
        const good = kind === 'string' ? typeof v === 'string' : kind === 'int' ? Number.isInteger(v) : Array.isArray(v)
        if (!good) errors.push(`${key}[${idx}].${f} inválido.`)
      }
    })
  }
  if (!errors.length) {
    for (const t of (obj.transactions as { id: string; totalAmount: number; splits: { amount: number }[] }[] | undefined) ?? [])
      if (sum(t.splits.map((s) => s.amount)) !== t.totalAmount) errors.push(`Compra ${t.id}: divisão não soma o total.`)
    for (const t of (obj.installments as { id: string; amount: number; splits: { amount: number }[] }[] | undefined) ?? [])
      if (sum(t.splits.map((s) => s.amount)) !== t.amount) errors.push(`Parcela ${t.id}: divisão não soma o valor.`)
  }
  return { ok: errors.length === 0, errors: errors.slice(0, 8) }
}

export function toBackup(data: AppData) {
  const out: Record<string, unknown> = { app: 'meu-financeiro', version: 1, exportedAt: new Date().toISOString() }
  for (const t of LIST_TABLES) out[BACKUP_KEYS[t]] = data[t]
  out.settings = data.settings
  return out
}

export function fromBackup(raw: Record<string, unknown>): AppData {
  const data = emptyData() as unknown as Record<string, unknown>
  for (const t of LIST_TABLES as readonly ListKey[]) {
    const v = raw[BACKUP_KEYS[t]]
    data[t] = Array.isArray(v) ? v : []
  }
  const s = raw.settings as { openingBalance?: number } | undefined
  data.settings = { openingBalance: Number.isInteger(s?.openingBalance) ? s!.openingBalance : 0 }
  return data as unknown as AppData
}
