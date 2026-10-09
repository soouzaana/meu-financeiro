export type ID = string
export type Cents = number

export interface Person { id: ID; name: string; isMe: boolean; createdAt: string }
export interface CreditCard { id: ID; name: string; closingDay: number; dueDay: number }
export interface Invoice {
  id: ID; cardId: ID; month: string // mês de vencimento YYYY-MM
  closingDate: string; dueDate: string; realAmount: Cents | null; closed: boolean
}
export type TxStatus = 'pendente' | 'conferida'
export interface TransactionSplit { personId: ID; amount: Cents }
export interface CreditCardTransaction {
  id: ID; cardId: ID; description: string; date: string
  totalAmount: Cents; installments: number; startNumber: number; firstInvoiceMonth: string
  categoryId: ID | null; note: string; status: TxStatus
  splits: TransactionSplit[]; createdAt: string
}
export interface Installment {
  id: ID; transactionId: ID; number: number; total: number
  invoiceMonth: string; amount: Cents; splits: TransactionSplit[]
}
export interface InvoicePayment { id: ID; invoiceId: ID; amount: Cents; date: string; note: string }
export interface Reserve {
  id: ID; name: string; purpose: string; transactionId: ID | null
  createdAt: string; status: 'ativa' | 'concluida'
}
export type MovementType = 'deposito' | 'retirada' | 'rendimento'
export interface ReserveMovement { id: ID; reserveId: ID; type: MovementType; amount: Cents; date: string; note: string }
export interface Income {
  id: ID; description: string; amount: Cents; date: string
  categoryId: ID | null; recurring: boolean; note: string
}
export type ExpenseKind = 'consumo' | 'reserva'
export interface Expense {
  id: ID; description: string; amount: Cents; date: string; categoryId: ID | null
  dueDate: string | null; status: 'pendente' | 'pago'; paymentMethod: string
  recurring: boolean; note: string; kind: ExpenseKind
  billId: ID | null; billMonth: string | null
}
export interface RecurringBill {
  id: ID; name: string; amount: Cents; dueDay: number; categoryId: ID | null
  kind: ExpenseKind; active: boolean; startMonth: string; note: string
}
export interface Loan { id: ID; personName: string; amount: Cents; date: string; description: string; dueDate: string | null }
export interface LoanPayment { id: ID; loanId: ID; amount: Cents; date: string; note: string }
export type CategoryScope = 'card' | 'personal' | 'income'
export interface Category { id: ID; name: string; scope: CategoryScope }

export type InvoiceStatus = 'aberta' | 'fechada' | 'parcial' | 'paga' | 'atrasada'
export type DerivedExpenseStatus = 'pendente' | 'pago' | 'atrasado'

export interface AppData {
  people: Person[]; cards: CreditCard[]; invoices: Invoice[]
  transactions: CreditCardTransaction[]; installments: Installment[]; payments: InvoicePayment[]
  categories: Category[]; reserves: Reserve[]; reserveMovements: ReserveMovement[]
  incomes: Income[]; expenses: Expense[]; bills: RecurringBill[]
  loans: Loan[]; loanPayments: LoanPayment[]
  settings: { openingBalance: Cents }
}
