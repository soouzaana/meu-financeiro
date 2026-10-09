import type { CreditCard, CreditCardTransaction, Installment, Invoice, InvoicePayment, InvoiceStatus, TransactionSplit } from '@/types'
import { addMonths, dateInMonth, monthOf } from '@/utils/dates'
import { allocate, splitEven, sum } from '@/utils/money'
import { uid } from '@/utils/id'
import {
  calculateInvoiceDifference, calculateInvoicePaid, calculateInvoiceRemaining, calculatePersonTotals,
} from './calculations'

export const invoiceId = (cardId: string, month: string) => `${cardId}_${month}`

/** `month` = mês do vencimento. */
export function invoiceDates(card: Pick<CreditCard, 'closingDay' | 'dueDay'>, month: string) {
  const dueDate = dateInMonth(month, card.dueDay)
  const closeMonth = card.closingDay < card.dueDay ? month : addMonths(month, -1)
  return { closingDate: dateInMonth(closeMonth, card.closingDay), dueDate }
}

/** Fatura em que uma compra feita em `dateISO` cai. */
export function suggestInvoiceMonth(card: CreditCard, dateISO: string): string {
  const m = monthOf(dateISO)
  for (let k = -1; k <= 2; k++) {
    const cand = addMonths(m, k)
    if (invoiceDates(card, cand).closingDate >= dateISO) return cand
  }
  return addMonths(m, 1)
}

/** Fatura "atual": a de vencimento mais próximo que ainda não passou. */
export function currentInvoiceMonth(card: CreditCard, today: string): string {
  const m = monthOf(today)
  for (let k = -1; k <= 2; k++) {
    const cand = addMonths(m, k)
    if (invoiceDates(card, cand).dueDate >= today) return cand
  }
  return m
}

export function invoiceStatus(
  inv: Pick<Invoice, 'closingDate' | 'dueDate' | 'closed'>, base: number, paid: number, today: string,
): InvoiceStatus {
  const remaining = base - paid
  if (base > 0 && remaining <= 0) return 'paga'
  if (remaining > 0 && inv.dueDate < today) return 'atrasada'
  if (paid > 0) return 'parcial'
  if (inv.closed || today > inv.closingDate) return 'fechada'
  return 'aberta'
}

export interface InvoiceSummary {
  month: string; invoice: Invoice; launched: number; real: number | null; base: number
  diff: number; paid: number; remaining: number; status: InvoiceStatus
  byPerson: Record<string, number>; count: number
}

export function summarizeInvoice(a: {
  card: CreditCard; invoices: Invoice[]; installments: Installment[]
  payments: InvoicePayment[]; month: string; today: string
}): InvoiceSummary {
  const { card, month, today } = a
  const stored = a.invoices.find((i) => i.cardId === card.id && i.month === month)
  const invoice: Invoice = stored ?? {
    id: invoiceId(card.id, month), cardId: card.id, month, ...invoiceDates(card, month), realAmount: null, closed: false,
  }
  const insts = a.installments.filter((i) => i.invoiceMonth === month)
  const launched = sum(insts.map((i) => i.amount))
  const real = invoice.realAmount
  const base = real ?? launched
  const paid = calculateInvoicePaid(a.payments, invoice.id)
  return {
    month, invoice, launched, real, base,
    diff: calculateInvoiceDifference(real, launched),
    paid, remaining: calculateInvoiceRemaining(base, paid),
    status: invoiceStatus(invoice, base, paid, today),
    byPerson: calculatePersonTotals(a.installments, month), count: insts.length,
  }
}

/** Gera as parcelas (da atual até a última). Cada parcela divide seu valor entre as pessoas sem perder centavos. */
export function buildInstallments(tx: CreditCardTransaction): Installment[] {
  const n = Math.max(1, tx.installments)
  const start = Math.min(Math.max(1, tx.startNumber), n)
  const amounts = splitEven(tx.totalAmount, n)
  const people = tx.splits.filter((s) => s.amount > 0)
  const out: Installment[] = []
  for (let num = start; num <= n; num++) {
    const amount = amounts[num - 1]
    const parts = allocate(amount, people.map((p) => p.amount))
    const splits: TransactionSplit[] = people.map((p, i) => ({ personId: p.personId, amount: parts[i] }))
    out.push({
      id: uid(), transactionId: tx.id, number: num, total: n,
      invoiceMonth: addMonths(tx.firstInvoiceMonth, num - start), amount, splits,
    })
  }
  return out
}
