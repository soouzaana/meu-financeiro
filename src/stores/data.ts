import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import type { Table } from 'dexie'
import { db, LIST_TABLES, type ListKey } from '@/db'
import type {
  AppData, Category, CreditCardTransaction, Expense, Income, Loan, LoanPayment, MovementType, Person,
  RecurringBill, Reserve, ReserveMovement,
} from '@/types'
import { uid } from '@/utils/id'
import { todayISO, monthOf, addMonths } from '@/utils/dates'
import { sum } from '@/utils/money'
import {
  billPaidExpense, calculateAmountDue, calculateAvailableBalance, calculateLoanBalance, calculateMonthSummary,
  calculatePersonTotals, calculateReceivable, calculateReservedBalance, calculateReserveBalance,
  calculateReserveYield, calculateTotalBalance, upcomingDues,
} from '@/services/calculations'
import {
  buildInstallments, currentInvoiceMonth, invoiceDates, invoiceId, summarizeInvoice,
} from '@/services/invoices'
import { baseData, emptyData, ME_ID } from '@/services/seed'
import { buildDemo } from '@/services/demo'
import { fromBackup, toBackup, validateBackup } from '@/services/backup'

type State = Omit<AppData, 'settings'>
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

export const useDataStore = defineStore('data', () => {
  const s = reactive<State>(emptyData() as State)
  const opening = ref(0)
  const ready = ref(false)

  /* ---------- persistência ---------- */
  const tbl = (t: ListKey) => db[t] as unknown as Table<{ id: string }, string>

  async function save<K extends ListKey>(t: K, item: State[K][number]): Promise<State[K][number]> {
    const plain = clone(item)
    await tbl(t).put(plain as { id: string })
    const arr = s[t] as { id: string }[]
    const i = arr.findIndex((x) => x.id === (plain as { id: string }).id)
    if (i >= 0) arr.splice(i, 1, plain as { id: string }); else arr.push(plain as { id: string })
    return plain
  }
  async function remove(t: ListKey, id: string) {
    await tbl(t).delete(id)
    const arr = s[t] as { id: string }[]
    const i = arr.findIndex((x) => x.id === id)
    if (i >= 0) arr.splice(i, 1)
  }

  async function replaceAll(data: AppData) {
    await db.transaction('rw', db.tables, async () => {
      for (const t of LIST_TABLES) { await tbl(t).clear(); await tbl(t).bulkPut(clone(data[t]) as { id: string }[]) }
      await db.settings.clear()
      await db.settings.put({ key: 'app', openingBalance: data.settings.openingBalance })
    })
    await load()
  }

  async function load() {
    for (const t of LIST_TABLES) (s[t] as unknown[]).splice(0, (s[t] as unknown[]).length, ...(await tbl(t).toArray()))
    const row = await db.settings.get('app')
    opening.value = row?.openingBalance ?? 0
    ready.value = true
  }

  async function init() {
    await load()
    if (!s.cards.length || !s.people.length) {
      const base = baseData()
      if (!s.cards.length) await save('cards', base.cards[0])
      if (!s.people.length) await save('people', base.people[0])
      if (!s.categories.length) for (const c of base.categories) await save('categories', c)
    }
  }

  /* ---------- getters ---------- */
  const today = () => todayISO()
  const card = computed(() => s.cards[0])
  const me = computed(() => s.people.find((p) => p.isMe) ?? s.people[0])
  const currentMonth = computed(() => (card.value ? currentInvoiceMonth(card.value, today()) : monthOf(today())))
  const personName = (id: string) => s.people.find((p) => p.id === id)?.name ?? 'Removida'
  const categoryName = (id: string | null) => (id ? s.categories.find((c) => c.id === id)?.name ?? 'Sem categoria' : 'Sem categoria')
  const summary = (month: string) =>
    summarizeInvoice({ card: card.value, invoices: s.invoices, installments: s.installments, payments: s.payments, month, today: today() })
  const personTotals = (month: string) => calculatePersonTotals(s.installments, month)

  const totalBalance = computed(() => calculateTotalBalance({
    opening: opening.value, incomes: s.incomes, expenses: s.expenses, payments: s.payments,
    loans: s.loans, loanPayments: s.loanPayments, today: today(),
  }))
  const reservedBalance = computed(() => calculateReservedBalance(s.reserveMovements))
  const reserveYield = computed(() => calculateReserveYield(s.reserveMovements))
  const availableBalance = computed(() => calculateAvailableBalance(totalBalance.value, reservedBalance.value))
  const receivable = computed(() => calculateReceivable(s.loans, s.loanPayments))
  const amountDue = (month: string) => calculateAmountDue({ bills: s.bills, expenses: s.expenses, month })
  const monthSummary = (month: string) => calculateMonthSummary({
    incomes: s.incomes, expenses: s.expenses, bills: s.bills, installments: s.installments, meId: me.value?.id ?? null, month,
  })
  const upcoming = (month: string) => {
    const inv = summary(currentMonth.value)
    return upcomingDues({
      bills: s.bills, expenses: s.expenses, month, today: today(),
      invoiceDue: inv.remaining > 0 ? { date: inv.invoice.dueDate, amount: inv.remaining } : null,
    })
  }
  const reserveBalance = (id: string) => calculateReserveBalance(s.reserveMovements, id)
  const loanBalance = (l: Loan) => calculateLoanBalance(l, s.loanPayments)

  /* ---------- pessoas / categorias ---------- */
  const savePerson = (p: Partial<Person> & { name: string }) =>
    save('people', { id: p.id ?? uid(), name: p.name.trim(), isMe: p.isMe ?? false, createdAt: p.createdAt ?? new Date().toISOString() })
  async function deletePerson(id: string) {
    if (id === ME_ID || s.people.find((p) => p.id === id)?.isMe) throw new Error('"Eu" não pode ser excluído.')
    if (s.transactions.some((t) => t.splits.some((x) => x.personId === id)))
      throw new Error('Esta pessoa tem compras no cartão. Remova ou reatribua as compras antes de excluir.')
    await remove('people', id)
  }
  const saveCategory = (c: Partial<Category> & Pick<Category, 'name' | 'scope'>) => save('categories', { id: c.id ?? uid(), name: c.name.trim(), scope: c.scope })
  const deleteCategory = (id: string) => remove('categories', id)

  /* ---------- cartão ---------- */
  async function ensureInvoice(month: string) {
    const found = s.invoices.find((i) => i.cardId === card.value.id && i.month === month)
    if (found) return found
    return save('invoices', {
      id: invoiceId(card.value.id, month), cardId: card.value.id, month, ...invoiceDates(card.value, month), realAmount: null, closed: false,
    })
  }
  async function updateCard(patch: { name: string; closingDay: number; dueDay: number }) {
    await save('cards', { ...card.value, ...patch })
    for (const inv of [...s.invoices]) await save('invoices', { ...inv, ...invoiceDates(card.value, inv.month) })
  }

  async function saveTransaction(tx: CreditCardTransaction) {
    if (sum(tx.splits.map((x) => x.amount)) !== tx.totalAmount) throw new Error('A soma das divisões é diferente do valor total.')
    if (tx.totalAmount <= 0) throw new Error('Informe um valor maior que zero.')
    for (const old of s.installments.filter((i) => i.transactionId === tx.id)) await remove('installments', old.id)
    await save('transactions', tx)
    for (const inst of buildInstallments(tx)) { await ensureInvoice(inst.invoiceMonth); await save('installments', inst) }
  }
  async function deleteTransaction(id: string) {
    for (const i of s.installments.filter((x) => x.transactionId === id)) await remove('installments', i.id)
    for (const r of s.reserves.filter((x) => x.transactionId === id)) await save('reserves', { ...r, transactionId: null })
    await remove('transactions', id)
  }
  async function setTxStatus(id: string, status: 'pendente' | 'conferida') {
    const tx = s.transactions.find((t) => t.id === id)
    if (tx) await save('transactions', { ...tx, status })
  }
  async function addPayment(month: string, amount: number, date: string, note: string) {
    if (amount <= 0) throw new Error('Informe um valor maior que zero.')
    const inv = await ensureInvoice(month)
    await save('payments', { id: uid(), invoiceId: inv.id, amount, date, note })
  }
  const removePayment = (id: string) => remove('payments', id)
  async function setInvoiceReal(month: string, real: number | null) {
    const inv = await ensureInvoice(month)
    await save('invoices', { ...inv, realAmount: real })
  }
  async function setInvoiceClosed(month: string, closed: boolean) {
    const inv = await ensureInvoice(month)
    await save('invoices', { ...inv, closed })
  }

  /* ---------- reservas ---------- */
  async function addMovement(reserveId: string, type: MovementType, amount: number, date: string, note = '') {
    if (amount <= 0) throw new Error('Informe um valor maior que zero.')
    if (type === 'retirada' && amount > reserveBalance(reserveId)) throw new Error('Saldo da reserva insuficiente.')
    await save('reserveMovements', { id: uid(), reserveId, type, amount, date, note })
  }
  async function createReserve(r: { name: string; purpose: string; transactionId: string | null; initial: number; date: string }) {
    const reserve: Reserve = { id: uid(), name: r.name.trim(), purpose: r.purpose, transactionId: r.transactionId, createdAt: r.date, status: 'ativa' }
    await save('reserves', reserve)
    if (r.initial > 0) await addMovement(reserve.id, 'deposito', r.initial, r.date, 'Valor inicial')
    return reserve
  }
  const updateReserve = (r: Reserve) => save('reserves', r)
  async function concludeReserve(id: string, date: string) {
    const r = s.reserves.find((x) => x.id === id)!
    const bal = reserveBalance(id)
    if (bal > 0) await addMovement(id, 'retirada', bal, date, 'Reserva utilizada')
    await save('reserves', { ...r, status: 'concluida' })
  }
  async function reopenReserve(id: string) {
    const r = s.reserves.find((x) => x.id === id)!
    await save('reserves', { ...r, status: 'ativa' })
  }
  async function deleteReserve(id: string) {
    for (const m of s.reserveMovements.filter((x) => x.reserveId === id)) await remove('reserveMovements', m.id)
    await remove('reserves', id)
  }
  const removeMovement = (id: string) => remove('reserveMovements', id)

  /* ---------- receitas / despesas / contas ---------- */
  const saveIncome = (i: Omit<Income, 'id'> & { id?: string }) => save('incomes', { ...i, id: i.id ?? uid() })
  const deleteIncome = (id: string) => remove('incomes', id)
  const saveExpense = (e: Omit<Expense, 'id'> & { id?: string }) => save('expenses', { ...e, id: e.id ?? uid() })
  const deleteExpense = (id: string) => remove('expenses', id)
  const saveBill = (b: Omit<RecurringBill, 'id'> & { id?: string }) => save('bills', { ...b, id: b.id ?? uid() })
  async function deleteBill(id: string) {
    for (const e of s.expenses.filter((x) => x.billId === id)) await remove('expenses', e.id)
    await remove('bills', id)
  }
  async function toggleBillPaid(bill: RecurringBill, month: string, date = today()) {
    const paid = billPaidExpense(s.expenses, bill.id, month)
    if (paid) return remove('expenses', paid.id)
    await save('expenses', {
      id: uid(), description: bill.name, amount: bill.amount, date, categoryId: bill.categoryId, dueDate: null,
      status: 'pago', paymentMethod: '', recurring: true, note: '', kind: bill.kind, billId: bill.id, billMonth: month,
    })
  }

  /* ---------- empréstimos ---------- */
  const saveLoan = (l: Omit<Loan, 'id'> & { id?: string }) => save('loans', { ...l, id: l.id ?? uid() })
  async function deleteLoan(id: string) {
    for (const p of s.loanPayments.filter((x) => x.loanId === id)) await remove('loanPayments', p.id)
    await remove('loans', id)
  }
  async function addLoanPayment(p: Omit<LoanPayment, 'id'>) {
    if (p.amount <= 0) throw new Error('Informe um valor maior que zero.')
    return save('loanPayments', { ...p, id: uid() })
  }
  const removeLoanPayment = (id: string) => remove('loanPayments', id)

  /* ---------- saldo / backup ---------- */
  async function setTotalBalance(target: number) {
    opening.value = opening.value + (target - totalBalance.value)
    await db.settings.put({ key: 'app', openingBalance: opening.value })
  }
  function exportData(): Record<string, unknown> {
    return toBackup({ ...(clone(s) as State), settings: { openingBalance: opening.value } })
  }
  async function importData(raw: unknown) {
    const v = validateBackup(raw)
    if (!v.ok) throw new Error(v.errors.join('\n'))
    await replaceAll(fromBackup(raw as Record<string, unknown>))
    await init()
  }
  async function wipeAll() { await replaceAll(baseData()) }
  async function loadDemo() {
    const t = today()
    const base = baseData()
    await replaceAll(buildDemo(t, currentInvoiceMonth(base.cards[0], t)))
  }

  return {
    s, opening, ready, init, load, card, me, currentMonth, personName, categoryName, summary, personTotals,
    totalBalance, reservedBalance, reserveYield, availableBalance, receivable, amountDue, monthSummary, upcoming,
    reserveBalance, loanBalance, savePerson, deletePerson, saveCategory, deleteCategory, ensureInvoice, updateCard,
    saveTransaction, deleteTransaction, setTxStatus, addPayment, removePayment, setInvoiceReal, setInvoiceClosed,
    addMovement, createReserve, updateReserve, concludeReserve, reopenReserve, deleteReserve, removeMovement,
    saveIncome, deleteIncome, saveExpense, deleteExpense, saveBill, deleteBill, toggleBillPaid,
    saveLoan, deleteLoan, addLoanPayment, removeLoanPayment, setTotalBalance, exportData, importData, wipeAll, loadDemo,
    addMonths,
  }
})
