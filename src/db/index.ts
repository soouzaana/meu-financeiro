import Dexie, { type Table } from 'dexie'
import type * as T from '@/types'

export interface SettingsRow { key: string; openingBalance: number }

export class FinanceDB extends Dexie {
  people!: Table<T.Person, string>
  cards!: Table<T.CreditCard, string>
  invoices!: Table<T.Invoice, string>
  transactions!: Table<T.CreditCardTransaction, string>
  installments!: Table<T.Installment, string>
  payments!: Table<T.InvoicePayment, string>
  categories!: Table<T.Category, string>
  reserves!: Table<T.Reserve, string>
  reserveMovements!: Table<T.ReserveMovement, string>
  incomes!: Table<T.Income, string>
  expenses!: Table<T.Expense, string>
  bills!: Table<T.RecurringBill, string>
  loans!: Table<T.Loan, string>
  loanPayments!: Table<T.LoanPayment, string>
  settings!: Table<SettingsRow, string>

  constructor(name = 'financeiro-local') {
    super(name)
    this.version(1).stores({
      people: 'id', cards: 'id', invoices: 'id,month', transactions: 'id',
      installments: 'id,transactionId,invoiceMonth', payments: 'id,invoiceId', categories: 'id',
      reserves: 'id', reserveMovements: 'id,reserveId', incomes: 'id', expenses: 'id,billId',
      bills: 'id', loans: 'id', loanPayments: 'id,loanId', settings: 'key',
    })
  }
}

export const db = new FinanceDB()

export const LIST_TABLES = [
  'people', 'cards', 'invoices', 'transactions', 'installments', 'payments', 'categories',
  'reserves', 'reserveMovements', 'incomes', 'expenses', 'bills', 'loans', 'loanPayments',
] as const
export type ListKey = (typeof LIST_TABLES)[number]

/** Nome da tabela interna → chave no arquivo de backup. */
export const BACKUP_KEYS: Record<ListKey, string> = {
  people: 'people', cards: 'cards', invoices: 'invoices', transactions: 'transactions',
  installments: 'installments', payments: 'payments', categories: 'categories',
  reserves: 'reserves', reserveMovements: 'reserveMovements', incomes: 'income',
  expenses: 'expenses', bills: 'accounts', loans: 'loans', loanPayments: 'loanPayments',
}
