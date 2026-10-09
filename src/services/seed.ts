import type { AppData, Category, CategoryScope } from '@/types'

export const ME_ID = 'p-eu'
export const CARD_ID = 'card-1'

const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
export const catId = (scope: CategoryScope, name: string) => `cat-${scope}-${slug(name)}`

const DEFAULTS: Record<CategoryScope, string[]> = {
  card: ['Alimentação', 'Compras', 'Viagem', 'Transporte', 'Saúde', 'Educação', 'Assinaturas', 'Lazer', 'Outros'],
  personal: ['Moradia', 'Alimentação', 'Transporte', 'Educação', 'Saúde', 'Academia', 'Concurso', 'Reserva', 'Lazer', 'Outros'],
  income: ['Salário', 'Pensão', 'Freelance', 'Reembolso', 'Outros'],
}

export function defaultCategories(): Category[] {
  return (Object.keys(DEFAULTS) as CategoryScope[]).flatMap((scope) =>
    DEFAULTS[scope].map((name) => ({ id: catId(scope, name), name, scope })))
}

export function emptyData(): AppData {
  return {
    people: [], cards: [], invoices: [], transactions: [], installments: [], payments: [], categories: [],
    reserves: [], reserveMovements: [], incomes: [], expenses: [], bills: [], loans: [], loanPayments: [],
    settings: { openingBalance: 0 },
  }
}

/** Dados mínimos de primeira execução (sem dados fictícios). */
export function baseData(): AppData {
  return {
    ...emptyData(),
    people: [{ id: ME_ID, name: 'Eu', isMe: true, createdAt: new Date().toISOString() }],
    cards: [{ id: CARD_ID, name: 'Meu cartão', closingDay: 3, dueDay: 10 }],
    categories: defaultCategories(),
  }
}
