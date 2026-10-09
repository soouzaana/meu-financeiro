import type {
  Expense, Income, Installment, InvoicePayment, Loan, LoanPayment, RecurringBill, ReserveMovement, DerivedExpenseStatus,
} from '@/types'
import { addMonths, dateInMonth, monthOf } from '@/utils/dates'
import { sum } from '@/utils/money'

/* ---------- Fatura ---------- */
export const calculateInvoiceTotal = (inst: Installment[], month: string): number =>
  sum(inst.filter((i) => i.invoiceMonth === month).map((i) => i.amount))

export function calculatePersonTotals(inst: Installment[], month: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const i of inst) {
    if (i.invoiceMonth !== month) continue
    for (const s of i.splits) out[s.personId] = (out[s.personId] ?? 0) + s.amount
  }
  return out
}
export const calculatePersonTotal = (inst: Installment[], month: string, personId: string): number =>
  calculatePersonTotals(inst, month)[personId] ?? 0

/** Total de uma pessoa nas faturas após `afterMonth`. */
export const calculatePersonFuture = (inst: Installment[], afterMonth: string, personId: string): number =>
  sum(inst.filter((i) => i.invoiceMonth > afterMonth).flatMap((i) => i.splits).filter((s) => s.personId === personId).map((s) => s.amount))

/** valor real da fatura − total lançado (0 se a fatura real não foi informada). */
export const calculateInvoiceDifference = (real: number | null, launched: number): number =>
  real === null ? 0 : real - launched
export const calculateInvoicePaid = (payments: InvoicePayment[], invoiceId: string): number =>
  sum(payments.filter((p) => p.invoiceId === invoiceId).map((p) => p.amount))
export const calculateInvoiceRemaining = (base: number, paid: number): number => base - paid

/* ---------- Reservas ---------- */
const signed = (m: ReserveMovement) => (m.type === 'retirada' ? -m.amount : m.amount)
export const calculateReservedBalance = (movs: ReserveMovement[]): number => sum(movs.map(signed))
export const calculateReserveBalance = (movs: ReserveMovement[], reserveId: string): number =>
  calculateReservedBalance(movs.filter((m) => m.reserveId === reserveId))
export const calculateReserveYield = (movs: ReserveMovement[], reserveId?: string): number =>
  sum(movs.filter((m) => m.type === 'rendimento' && (!reserveId || m.reserveId === reserveId)).map((m) => m.amount))

/* ---------- Saldo ---------- */
export function calculateTotalBalance(a: {
  opening: number; incomes: Income[]; expenses: Expense[]; payments: InvoicePayment[]
  loans: Loan[]; loanPayments: LoanPayment[]; today: string
}): number {
  const { today } = a
  return a.opening
    + sum(a.incomes.filter((i) => i.date <= today).map((i) => i.amount))
    - sum(a.expenses.filter((e) => e.status === 'pago' && e.date <= today).map((e) => e.amount))
    - sum(a.payments.filter((p) => p.date <= today).map((p) => p.amount))
    - sum(a.loans.filter((l) => l.date <= today).map((l) => l.amount))
    + sum(a.loanPayments.filter((p) => p.date <= today).map((p) => p.amount))
}
export const calculateAvailableBalance = (total: number, reserved: number): number => total - reserved

/* ---------- Despesas / contas ---------- */
export const expenseMonth = (e: Expense): string => e.billMonth ?? monthOf(e.dueDate ?? e.date)
export function expenseStatus(e: Expense, today: string): DerivedExpenseStatus {
  if (e.status === 'pago') return 'pago'
  return (e.dueDate ?? e.date) < today ? 'atrasado' : 'pendente'
}
export const billApplies = (b: RecurringBill, month: string): boolean => b.active && b.startMonth <= month
export const billPaidExpense = (expenses: Expense[], billId: string, month: string): Expense | undefined =>
  expenses.find((e) => e.billId === billId && e.billMonth === month && e.status === 'pago')
export function billStatus(b: RecurringBill, month: string, expenses: Expense[], today: string): DerivedExpenseStatus {
  if (billPaidExpense(expenses, b.id, month)) return 'pago'
  return dateInMonth(month, b.dueDay) < today ? 'atrasado' : 'pendente'
}

export function calculateAmountDue(a: { bills: RecurringBill[]; expenses: Expense[]; month: string }): number {
  const bills = a.bills.filter((b) => billApplies(b, a.month) && !billPaidExpense(a.expenses, b.id, a.month))
  const exps = a.expenses.filter((e) => !e.billId && e.status !== 'pago' && expenseMonth(e) <= a.month)
  return sum(bills.map((b) => b.amount)) + sum(exps.map((e) => e.amount))
}

/* ---------- Receitas ---------- */
const norm = (s: string) => s.trim().toLowerCase()
/** Receitas recorrentes de meses anteriores ainda não lançadas no mês. */
export function projectedRecurringIncome(incomes: Income[], month: string): Income[] {
  const latest = new Map<string, Income>()
  for (const r of incomes.filter((i) => i.recurring && monthOf(i.date) < month).sort((x, y) => x.date.localeCompare(y.date)))
    latest.set(norm(r.description), r)
  return [...latest.values()].filter((r) => !incomes.some((i) => monthOf(i.date) === month && norm(i.description) === norm(r.description)))
}

export function calculateMonthSummary(a: {
  incomes: Income[]; expenses: Expense[]; bills: RecurringBill[]; installments: Installment[]; meId: string | null; month: string
}) {
  const { month } = a
  const income = sum(a.incomes.filter((i) => monthOf(i.date) === month).map((i) => i.amount))
    + sum(projectedRecurringIncome(a.incomes, month).map((i) => i.amount))
  const exps = a.expenses.filter((e) => expenseMonth(e) === month)
  const pendingBills = a.bills.filter((b) => billApplies(b, month) && !billPaidExpense(a.expenses, b.id, month))
  const myCard = a.meId ? calculatePersonTotal(a.installments, month, a.meId) : 0
  const expenses = sum(exps.filter((e) => e.kind === 'consumo').map((e) => e.amount))
    + sum(pendingBills.filter((b) => b.kind === 'consumo').map((b) => b.amount)) + myCard
  const reserves = sum(exps.filter((e) => e.kind === 'reserva').map((e) => e.amount))
    + sum(pendingBills.filter((b) => b.kind === 'reserva').map((b) => b.amount))
  return { income, expenses, reserves, myCard, projected: income - expenses - reserves }
}

export interface DueItem { key: string; date: string; label: string; amount: number; kind: 'bill' | 'expense' | 'invoice'; overdue: boolean }
export function upcomingDues(a: {
  bills: RecurringBill[]; expenses: Expense[]; month: string; today: string
  invoiceDue?: { date: string; amount: number } | null
}): DueItem[] {
  const out: DueItem[] = []
  for (const m of [a.month, addMonths(a.month, 1)]) {
    for (const b of a.bills) {
      if (!billApplies(b, m) || billPaidExpense(a.expenses, b.id, m)) continue
      const date = dateInMonth(m, b.dueDay)
      out.push({ key: `b${b.id}${m}`, date, label: b.name, amount: b.amount, kind: 'bill', overdue: date < a.today })
    }
  }
  for (const e of a.expenses) {
    if (e.billId || e.status === 'pago' || expenseMonth(e) > addMonths(a.month, 1)) continue
    const date = e.dueDate ?? e.date
    out.push({ key: `e${e.id}`, date, label: e.description, amount: e.amount, kind: 'expense', overdue: date < a.today })
  }
  if (a.invoiceDue && a.invoiceDue.amount > 0)
    out.push({ key: 'inv', date: a.invoiceDue.date, label: 'Fatura do cartão', amount: a.invoiceDue.amount, kind: 'invoice', overdue: a.invoiceDue.date < a.today })
  return out.sort((x, y) => x.date.localeCompare(y.date))
}

/* ---------- Empréstimos ---------- */
export const calculateLoanPaid = (payments: LoanPayment[], loanId: string): number =>
  sum(payments.filter((p) => p.loanId === loanId).map((p) => p.amount))
export const calculateLoanBalance = (loan: Loan, payments: LoanPayment[]): number =>
  loan.amount - calculateLoanPaid(payments, loan.id)
export const calculateReceivable = (loans: Loan[], payments: LoanPayment[]): number =>
  sum(loans.map((l) => Math.max(0, calculateLoanBalance(l, payments))))
export function loanStatus(loan: Loan, payments: LoanPayment[], today: string): 'pago' | 'parcial' | 'atrasado' | 'aberto' {
  const bal = calculateLoanBalance(loan, payments)
  if (bal <= 0) return 'pago'
  if (loan.dueDate && loan.dueDate < today) return 'atrasado'
  return calculateLoanPaid(payments, loan.id) > 0 ? 'parcial' : 'aberto'
}
