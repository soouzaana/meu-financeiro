import type { AppData, CreditCardTransaction, Income, Expense, RecurringBill } from '@/types'
import { addMonths, dateInMonth, monthOf } from '@/utils/dates'
import { sum } from '@/utils/money'
import { uid } from '@/utils/id'
import { baseData, catId, CARD_ID, ME_ID } from './seed'
import { buildInstallments, invoiceDates, invoiceId } from './invoices'

const P = { eu: ME_ID, mae: 'p-mae', pai: 'p-pai', ju: 'p-ju', vida: 'p-vida', jonatas: 'p-jonatas', eduardo: 'p-eduardo' }

// [descrição, [[pessoa, centavos da parcela]...], parcela atual, total de parcelas, categoria]
type Row = [string, [string, number][], number, number, string]
const ROWS: Row[] = [
  ['Disney', [[P.mae, 3282]], 10, 12, 'Lazer'],
  ['Mercado Livre - Livro', [[P.vida, 4847]], 2, 3, 'Educação'],
  ['Mercado Livre - Batedeira', [[P.mae, 16162]], 3, 3, 'Compras'],
  ['Passagem ônibus', [[P.eu, 9387], [P.eduardo, 9387]], 1, 1, 'Transporte'],
  ['Moto', [[P.eduardo, 9334]], 3, 3, 'Transporte'],
  ['Acidente', [[P.eduardo, 22071]], 3, 7, 'Saúde'],
  ['Polo Wear', [[P.eu, 4300], [P.vida, 2000], [P.jonatas, 2200]], 3, 5, 'Compras'],
  ['Carregador Amazon', [[P.eu, 6850]], 2, 2, 'Compras'],
  ['Hotel', [[P.ju, 32564]], 2, 3, 'Viagem'],
  ['Ingresso Tripleween', [[P.eduardo, 3604]], 2, 3, 'Lazer'],
  ['Shein - Fantasia', [[P.eu, 4349]], 2, 2, 'Compras'],
  ['Curso PRF', [[P.eu, 4205]], 2, 2, 'Educação'],
  ['Academia TAF', [[P.eu, 2990]], 1, 1, 'Saúde'],
  ['Carro', [[P.pai, 22000]], 1, 3, 'Transporte'],
]

export function buildDemo(today: string, invMonth: string): AppData {
  const data = baseData()
  const now = new Date().toISOString()
  const names: Record<string, string> = { [P.mae]: 'Mãe', [P.pai]: 'Pai', [P.ju]: 'Ju', [P.vida]: 'Vida', [P.jonatas]: 'Jonatas', [P.eduardo]: 'Eduardo' }
  for (const [id, name] of Object.entries(names)) data.people.push({ id, name, isMe: false, createdAt: now })

  ROWS.forEach(([description, parts, cur, n, cat], idx) => {
    const perInstallment = sum(parts.map((p) => p[1]))
    const tx: CreditCardTransaction = {
      id: `tx-demo-${idx}`, cardId: CARD_ID, description,
      date: dateInMonth(addMonths(invMonth, -cur), 20),
      totalAmount: perInstallment * n, installments: n, startNumber: cur, firstInvoiceMonth: invMonth,
      categoryId: catId('card', cat), note: '', status: idx < 12 ? 'conferida' : 'pendente',
      splits: parts.map(([personId, amount]) => ({ personId, amount: amount * n })), createdAt: now,
    }
    data.transactions.push(tx)
    data.installments.push(...buildInstallments(tx))
  })

  const card = data.cards[0]
  const months = [...new Set(data.installments.map((i) => i.invoiceMonth))].sort()
  for (const month of months) {
    const launched = sum(data.installments.filter((i) => i.invoiceMonth === month).map((i) => i.amount))
    data.invoices.push({
      id: invoiceId(CARD_ID, month), cardId: CARD_ID, month, ...invoiceDates(card, month),
      realAmount: month === invMonth ? launched : null, closed: false,
    })
  }
  data.payments.push({ id: uid(), invoiceId: invoiceId(CARD_ID, invMonth), amount: 30000, date: today, note: 'Abatimento antecipado' })

  const hotel = data.transactions.find((t) => t.description === 'Hotel')!
  data.reserves.push(
    { id: 'rs-1', name: 'Hotel - Ju', purpose: 'Pagar o hotel da Ju na fatura', transactionId: hotel.id, createdAt: today, status: 'ativa' },
    { id: 'rs-2', name: 'Fatura Novembro', purpose: 'Folga para a fatura do mês seguinte', transactionId: null, createdAt: today, status: 'ativa' },
  )
  const mv = (reserveId: string, type: 'deposito' | 'rendimento', amount: number, note: string) =>
    data.reserveMovements.push({ id: uid(), reserveId, type, amount, date: today, note })
  mv('rs-1', 'deposito', 32564, 'Valor inicial'); mv('rs-1', 'rendimento', 320, 'Rendimento')
  mv('rs-2', 'deposito', 50000, 'Valor inicial'); mv('rs-2', 'rendimento', 472, 'Rendimento')

  const thisMonth = monthOf(today)
  const inc = (description: string, amount: number, cat: string, recurring: boolean): Income =>
    ({ id: uid(), description, amount, date: dateInMonth(thisMonth, 1), categoryId: catId('income', cat), recurring, note: '' })
  data.incomes.push(inc('Salário', 150000, 'Salário', true), inc('Pensão', 60000, 'Pensão', true), inc('Freelance', 50000, 'Freelance', false))

  const bill = (name: string, amount: number, dueDay: number, cat: string, kind: 'consumo' | 'reserva' = 'consumo'): RecurringBill =>
    ({ id: `bill-${name}`, name, amount, dueDay, categoryId: catId('personal', cat), kind, active: true, startMonth: addMonths(thisMonth, -6), note: '' })
  data.bills.push(
    bill('Faculdade', 20000, 10, 'Educação'), bill('Internet', 5500, 15, 'Moradia'), bill('Academia', 15990, 5, 'Academia'),
    bill('Reserva financeira', 20000, 10, 'Reserva', 'reserva'), bill('Parcela do celular', 84000, 10, 'Outros'),
  )
  const exp = (e: Partial<Expense> & Pick<Expense, 'description' | 'amount' | 'categoryId'>): Expense => ({
    id: uid(), date: dateInMonth(thisMonth, 2), dueDate: null, status: 'pago', paymentMethod: 'Pix',
    recurring: false, note: '', kind: 'consumo', billId: null, billMonth: null, ...e,
  })
  data.expenses.push(
    exp({ description: 'Gasolina', amount: 15000, categoryId: catId('personal', 'Transporte') }),
    exp({ description: 'Alimentação', amount: 23000, categoryId: catId('personal', 'Alimentação') }),
    exp({ description: 'Exames', amount: 18000, categoryId: catId('personal', 'Saúde'), status: 'pendente', dueDate: dateInMonth(thisMonth, 28) }),
    exp({ description: 'Faculdade', amount: 20000, categoryId: catId('personal', 'Educação'), billId: 'bill-Faculdade', billMonth: thisMonth }),
  )

  data.loans.push({ id: 'ln-1', personName: 'Eduardo', amount: 30000, date: dateInMonth(thisMonth, 1), description: 'Empréstimo', dueDate: addMonths(thisMonth, 1) + '-15' })
  data.loanPayments.push({ id: uid(), loanId: 'ln-1', amount: 10000, date: today, note: '' })
  data.settings.openingBalance = 200000
  return data
}
