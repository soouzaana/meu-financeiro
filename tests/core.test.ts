import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { allocate, splitEven, sum } from '@/utils/money'
import { todayISO, monthOf, addMonths } from '@/utils/dates'
import { ME_ID } from '@/services/seed'
import { validateBackup } from '@/services/backup'
import { calculateInvoiceDifference, projectedRecurringIncome, calculateLoanBalance } from '@/services/calculations'
import type { CreditCardTransaction } from '@/types'

const today = todayISO()
let d: ReturnType<typeof useDataStore>

function tx(over: Partial<CreditCardTransaction> & { splits: { personId: string; amount: number }[]; totalAmount: number }): CreditCardTransaction {
  return {
    id: 't' + Math.random(), cardId: 'card-1', description: 'X', date: today, installments: 1, startNumber: 1,
    firstInvoiceMonth: d.currentMonth, categoryId: null, note: '', status: 'pendente', createdAt: '', ...over,
  }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  d = useDataStore()
  await d.init()
  await d.wipeAll()
})

describe('dinheiro', () => {
  it('allocate/splitEven não perdem centavos', () => {
    expect(sum(allocate(18774, [1, 1]))).toBe(18774)
    expect(allocate(18774, [1, 1])).toEqual([9387, 9387])
    expect(sum(allocate(10000, [1, 1, 1]))).toBe(10000)
    expect(splitEven(10001, 3)).toEqual([3334, 3334, 3333])
    expect(sum(allocate(33333, [20000, 15000, 15000]))).toBe(33333)
  })
})

describe('cartão', () => {
  it('1. compra simples', async () => {
    await d.saveTransaction(tx({ totalAmount: 5000, splits: [{ personId: ME_ID, amount: 5000 }] }))
    expect(d.summary(d.currentMonth).launched).toBe(5000)
  })
  it('2. parcelada: 12x e restantes', async () => {
    const t = tx({ totalAmount: 672000, installments: 12, startNumber: 2, splits: [{ personId: ME_ID, amount: 672000 }] })
    await d.saveTransaction(t)
    const insts = d.s.installments.filter((i) => i.transactionId === t.id)
    expect(insts).toHaveLength(11)
    expect(insts[0].amount).toBe(56000)
    expect(insts[0].number).toBe(2)
    expect(insts[10].invoiceMonth).toBe(addMonths(d.currentMonth, 10))
  })
  it('3 e 4. divisão entre duas e três pessoas', async () => {
    await d.savePerson({ name: 'Eduardo' }); await d.savePerson({ name: 'Vida' })
    const [ed, vi] = [d.s.people.find((p) => p.name === 'Eduardo')!.id, d.s.people.find((p) => p.name === 'Vida')!.id]
    await d.saveTransaction(tx({ totalAmount: 18774, splits: [{ personId: ME_ID, amount: 9387 }, { personId: ed, amount: 9387 }] }))
    await d.saveTransaction(tx({ totalAmount: 50000, splits: [{ personId: ME_ID, amount: 20000 }, { personId: vi, amount: 15000 }, { personId: ed, amount: 15000 }] }))
    const t = d.personTotals(d.currentMonth)
    expect(t[ME_ID]).toBe(29387); expect(t[ed]).toBe(24387); expect(t[vi]).toBe(15000)
    expect(sum(Object.values(t))).toBe(d.summary(d.currentMonth).launched)
  })
  it('divisão inválida é recusada', async () => {
    await expect(d.saveTransaction(tx({ totalAmount: 50000, splits: [{ personId: ME_ID, amount: 45000 }] }))).rejects.toThrow()
  })
  it('5 e 6. alterar divisão e excluir', async () => {
    await d.savePerson({ name: 'Ju' })
    const ju = d.s.people.find((p) => p.name === 'Ju')!.id
    const t = tx({ totalAmount: 30000, splits: [{ personId: ME_ID, amount: 30000 }] })
    await d.saveTransaction(t)
    await d.saveTransaction({ ...t, splits: [{ personId: ME_ID, amount: 10000 }, { personId: ju, amount: 20000 }] })
    expect(d.s.installments.filter((i) => i.transactionId === t.id)).toHaveLength(1)
    expect(d.personTotals(d.currentMonth)[ju]).toBe(20000)
    await d.deleteTransaction(t.id)
    expect(d.summary(d.currentMonth).launched).toBe(0)
    expect(d.s.installments).toHaveLength(0)
  })
  it('7 e 8. abatimentos parciais e múltiplos', async () => {
    await d.saveTransaction(tx({ totalAmount: 223181, splits: [{ personId: ME_ID, amount: 223181 }] }))
    await d.addPayment(d.currentMonth, 20000, today, '')
    await d.addPayment(d.currentMonth, 15000, today, '')
    await d.addPayment(d.currentMonth, 10000, today, '')
    const s = d.summary(d.currentMonth)
    expect(s.paid).toBe(45000); expect(s.remaining).toBe(178181); expect(s.status).toBe('parcial')
  })
  it('15 e 16. fatura com e sem diferença', async () => {
    await d.saveTransaction(tx({ totalAmount: 221181, splits: [{ personId: ME_ID, amount: 221181 }] }))
    await d.setInvoiceReal(d.currentMonth, 223181)
    expect(d.summary(d.currentMonth).diff).toBe(2000)
    await d.setInvoiceReal(d.currentMonth, 221181)
    expect(d.summary(d.currentMonth).diff).toBe(0)
    expect(calculateInvoiceDifference(null, 100)).toBe(0)
  })
  it('17 e 18. parcelas futuras e fechamento', async () => {
    await d.saveTransaction(tx({ totalAmount: 30000, installments: 3, splits: [{ personId: ME_ID, amount: 30000 }] }))
    expect(d.summary(addMonths(d.currentMonth, 2)).launched).toBe(10000)
    await d.setInvoiceClosed(d.currentMonth, true)
    expect(d.summary(d.currentMonth).status).toBe('fechada')
  })
})

describe('reservas, saldo, contas, empréstimos', () => {
  it('9, 10 e saldo disponível', async () => {
    await d.setTotalBalance(200000)
    const r = await d.createReserve({ name: 'Hotel - Ju', purpose: '', transactionId: null, initial: 32564, date: today })
    await d.addMovement(r.id, 'rendimento', 320, today)
    expect(d.reserveBalance(r.id)).toBe(32884)
    expect(d.totalBalance).toBe(200000)
    expect(d.availableBalance).toBe(200000 - 32884)
    await expect(d.addMovement(r.id, 'retirada', 99999999, today)).rejects.toThrow()
  })
  it('11. empréstimo parcial', async () => {
    const l = await d.saveLoan({ personName: 'Eduardo', amount: 30000, date: today, description: '', dueDate: null })
    await d.addLoanPayment({ loanId: l.id, amount: 10000, date: today, note: '' })
    expect(calculateLoanBalance(l, d.s.loanPayments)).toBe(20000)
    expect(d.receivable).toBe(20000)
  })
  it('12 e 13. conta paga e atrasada', async () => {
    const b = await d.saveBill({ name: 'Internet', amount: 5500, dueDay: 15, categoryId: null, kind: 'consumo', active: true, startMonth: '2020-01', note: '' })
    expect(d.amountDue('2026-10')).toBeGreaterThanOrEqual(5500)
    const m = monthOf(today)
    await d.toggleBillPaid(b, m)
    expect(d.amountDue(m)).toBe(0)
    await d.toggleBillPaid(b, m)
    expect(d.amountDue(m)).toBe(5500)
  })
  it('14. receita recorrente é projetada', async () => {
    const i = await d.saveIncome({ description: 'Salário', amount: 150000, date: '2020-01-05', categoryId: null, recurring: true, note: '' })
    expect(projectedRecurringIncome(d.s.incomes, '2020-02')).toHaveLength(1)
    expect(projectedRecurringIncome(d.s.incomes, '2020-01')).toHaveLength(0)
    expect(i.recurring).toBe(true)
  })
})

describe('backup e demo', () => {
  it('19 e 20. exporta, valida, apaga e restaura', async () => {
    await d.loadDemo()
    const before = JSON.stringify(d.exportData())
    const totals = d.summary(d.currentMonth).launched
    expect(totals).toBe(159532)
    const exported = JSON.parse(before)
    expect(validateBackup(exported).ok).toBe(true)
    await d.wipeAll()
    expect(d.s.transactions).toHaveLength(0)
    await d.importData(exported)
    expect(d.summary(d.currentMonth).launched).toBe(totals)
    expect(sum(Object.values(d.personTotals(d.currentMonth)))).toBe(totals)
    expect(d.s.transactions).toHaveLength(14)
  })
  it('backup inválido é recusado e não altera dados', async () => {
    await d.loadDemo()
    await expect(d.importData({ people: 'x' })).rejects.toThrow()
    expect(d.s.transactions).toHaveLength(14)
  })
  it('persistência real no IndexedDB (recarrega do banco)', async () => {
    await d.loadDemo()
    await d.load()
    expect(d.s.people.length).toBe(7)
    expect(d.summary(d.currentMonth).paid).toBe(30000)
  })
  it('demo: Passagem ônibus 93,87 + 93,87', async () => {
    await d.loadDemo()
    const t = d.s.transactions.find((x) => x.description === 'Passagem ônibus')!
    expect(t.totalAmount).toBe(18774)
    expect(t.splits.map((x) => x.amount)).toEqual([9387, 9387])
  })
})
