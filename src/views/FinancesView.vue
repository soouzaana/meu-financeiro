<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Circle, CircleCheckBig, Trash2 } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { useMonth } from '@/composables/useMonth'
import { addMonths, dateInMonth, formatDate, monthOf, todayISO } from '@/utils/dates'
import { projectedRecurringIncome, expenseStatus, expenseMonth } from '@/services/calculations'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import type { Expense, ExpenseKind, Income } from '@/types'
import PageHeader from '@/components/PageHeader.vue'
import MonthNav from '@/components/MonthNav.vue'
import Money from '@/components/Money.vue'
import Badge from '@/components/Badge.vue'
import Sheet from '@/components/Sheet.vue'
import Field from '@/components/Field.vue'
import MoneyInput from '@/components/MoneyInput.vue'
import Empty from '@/components/Empty.vue'

const d = useDataStore(); const { month } = useMonth(); const today = todayISO()
const tab = ref<'receitas' | 'despesas'>('receitas')
const ms = computed(() => d.monthSummary(month.value))
const incomes = computed(() => d.s.incomes.filter((i) => monthOf(i.date) === month.value).sort((a, b) => b.date.localeCompare(a.date)))
const projected = computed(() => projectedRecurringIncome(d.s.incomes, month.value))
const expenses = computed(() => d.s.expenses.filter((e) => expenseMonth(e) === month.value).sort((a, b) => (b.dueDate ?? b.date).localeCompare(a.dueDate ?? a.date)))
const incCats = computed(() => d.s.categories.filter((c) => c.scope === 'income'))
const expCats = computed(() => d.s.categories.filter((c) => c.scope === 'personal'))
const METHODS = ['Pix', 'Débito', 'Dinheiro', 'Cartão de crédito', 'Boleto', 'Transferência']

/* receita */
const incOpen = ref(false)
const blankInc = (): Omit<Income, 'id'> & { id?: string } => ({ description: '', amount: 0, date: month.value === monthOf(today) ? today : dateInMonth(month.value, 1), categoryId: null, recurring: false, note: '' })
const inc = ref(blankInc())
const openInc = (i?: Income) => { inc.value = i ? { ...i } : blankInc(); incOpen.value = true }
async function saveInc() {
  if (!inc.value.description.trim() || inc.value.amount <= 0) return toast('Informe descrição e valor.', 'err')
  try { await d.saveIncome({ ...inc.value, description: inc.value.description.trim() }); incOpen.value = false; toast('Receita salva') } catch (e) { toast(errMsg(e), 'err') }
}
async function delInc() {
  if (inc.value.id && await askConfirm({ title: 'Excluir receita?' })) { await d.deleteIncome(inc.value.id); incOpen.value = false }
}
const launchProjected = (p: Income) => d.saveIncome({ ...p, id: undefined, date: dateInMonth(month.value, Number(p.date.slice(8))) })

/* despesa */
const expOpen = ref(false)
const blankExp = (): Omit<Expense, 'id'> & { id?: string } => ({
  description: '', amount: 0, date: month.value === monthOf(today) ? today : dateInMonth(month.value, 1), categoryId: null,
  dueDate: null, status: 'pendente', paymentMethod: 'Pix', recurring: false, note: '', kind: 'consumo' as ExpenseKind, billId: null, billMonth: null,
})
const exp = ref(blankExp())
const openExp = (e?: Expense) => { exp.value = e ? { ...e } : blankExp(); expOpen.value = true }
async function saveExp() {
  if (!exp.value.description.trim() || exp.value.amount <= 0) return toast('Informe descrição e valor.', 'err')
  try { await d.saveExpense({ ...exp.value, description: exp.value.description.trim(), dueDate: exp.value.dueDate || null }); expOpen.value = false; toast('Despesa salva') } catch (e) { toast(errMsg(e), 'err') }
}
async function delExp() {
  if (exp.value.id && await askConfirm({ title: 'Excluir despesa?' })) { await d.deleteExpense(exp.value.id); expOpen.value = false }
}
const togglePaid = (e: Expense) => d.saveExpense({ ...e, status: e.status === 'pago' ? 'pendente' : 'pago', date: e.status === 'pago' ? e.date : today })
const tone = { pago: 'pos', pendente: 'neutral', atrasado: 'neg' } as const
const label = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' } as const
const fab = () => (tab.value === 'receitas' ? openInc() : openExp())
</script>
<template>
  <PageHeader title="Finanças">
    <template #actions><button class="icon-btn text-brand" :aria-label="tab === 'receitas' ? 'Nova receita' : 'Nova despesa'" @click="fab"><Plus :size="26" /></button></template>
  </PageHeader>
  <MonthNav v-model="month" />
  <div class="grid grid-cols-3 gap-2 mt-3">
    <div class="card p-3"><p class="text-xs text-ink-soft">Receitas</p><p class="font-bold text-[15px] mt-0.5"><Money :v="ms.income" /></p></div>
    <div class="card p-3"><p class="text-xs text-ink-soft">Despesas</p><p class="font-bold text-[15px] mt-0.5"><Money :v="ms.expenses" /></p></div>
    <div class="card p-3"><p class="text-xs text-ink-soft">Reservas</p><p class="font-bold text-[15px] mt-0.5"><Money :v="ms.reserves" /></p></div>
  </div>
  <p class="card px-4 py-3 mt-2 flex justify-between font-semibold"><span>Saldo projetado</span><Money :v="ms.projected" auto /></p>

  <div class="grid grid-cols-2 gap-1 bg-brand-100 rounded-xl p-1 mt-4" role="tablist">
    <button v-for="t in (['receitas', 'despesas'] as const)" :key="t" role="tab" :aria-selected="tab === t" class="min-h-[44px] rounded-lg font-semibold capitalize" :class="tab === t ? 'bg-white text-brand shadow-sm' : 'text-ink-soft'" @click="tab = t">{{ t }}</button>
  </div>

  <div v-if="tab === 'receitas'" class="card px-4 mt-3">
    <Empty v-if="!incomes.length && !projected.length" text="Nenhuma receita neste mês." />
    <button v-for="i in incomes" :key="i.id" class="row w-full text-left min-h-[56px]" @click="openInc(i)">
      <span class="min-w-0"><span class="block truncate font-medium">{{ i.description }}</span><span class="block text-[13px] text-ink-soft">{{ formatDate(i.date) }} · {{ d.categoryName(i.categoryId) }}<template v-if="i.recurring"> · recorrente</template></span></span>
      <Money :v="i.amount" class="font-semibold text-pos" />
    </button>
    <div v-for="p in projected" :key="p.id" class="row min-h-[56px] opacity-80">
      <span class="min-w-0"><span class="block truncate font-medium">{{ p.description }}</span><span class="block text-[13px] text-ink-soft">Previsto · recorrente</span></span>
      <span class="flex items-center gap-2"><Money :v="p.amount" /><button class="btn-soft !min-h-[40px] !px-3 text-sm" @click="launchProjected(p)">Lançar</button></span>
    </div>
  </div>

  <div v-else class="card px-4 mt-3">
    <Empty v-if="!expenses.length" text="Nenhuma despesa neste mês. Contas fixas ficam na aba Contas." />
    <div v-for="e in expenses" :key="e.id" class="row min-h-[56px]">
      <button class="icon-btn -ml-3" :aria-label="e.status === 'pago' ? 'Marcar como pendente' : 'Marcar como pago'" @click="togglePaid(e)">
        <CircleCheckBig v-if="e.status === 'pago'" :size="24" class="text-pos" /><Circle v-else :size="24" class="text-ink-faint" /></button>
      <button class="flex-1 min-w-0 text-left" @click="openExp(e)"><span class="block truncate font-medium">{{ e.description }}</span>
        <span class="block text-[13px] text-ink-soft">{{ formatDate(e.dueDate ?? e.date) }} · {{ d.categoryName(e.categoryId) }}</span></button>
      <span class="text-right"><Money :v="e.amount" class="font-semibold" /><span class="block"><Badge :tone="e.kind === 'reserva' ? 'brand' : tone[expenseStatus(e, today)]">{{ e.kind === 'reserva' ? 'Reserva' : label[expenseStatus(e, today)] }}</Badge></span></span>
    </div>
  </div>

  <Sheet v-model="incOpen" :title="inc.id ? 'Editar receita' : 'Nova receita'">
    <Field label="Descrição" v-slot="{ id }"><input :id="id" v-model="inc.description" class="input" placeholder="Ex.: Salário" /></Field>
    <Field label="Valor" v-slot="{ id }"><MoneyInput :id="id" v-model="inc.amount" /></Field>
    <Field label="Data" v-slot="{ id }"><input :id="id" v-model="inc.date" type="date" class="input" /></Field>
    <Field label="Categoria" v-slot="{ id }"><select :id="id" v-model="inc.categoryId" class="input"><option :value="null">Sem categoria</option><option v-for="c in incCats" :key="c.id" :value="c.id">{{ c.name }}</option></select></Field>
    <label class="flex items-center gap-3 min-h-[48px] mb-3"><input v-model="inc.recurring" type="checkbox" class="w-5 h-5 accent-brand" />Receita recorrente (todo mês)</label>
    <Field label="Observação" v-slot="{ id }"><input :id="id" v-model="inc.note" class="input" /></Field>
    <div class="grid gap-3" :class="inc.id ? 'grid-cols-[auto_1fr]' : ''">
      <button v-if="inc.id" class="btn-danger" aria-label="Excluir receita" @click="delInc"><Trash2 :size="18" /></button>
      <button class="btn-primary" @click="saveInc">Salvar</button>
    </div>
  </Sheet>

  <Sheet v-model="expOpen" :title="exp.id ? 'Editar despesa' : 'Nova despesa'">
    <Field label="Descrição" v-slot="{ id }"><input :id="id" v-model="exp.description" class="input" placeholder="Ex.: Gasolina" /></Field>
    <Field label="Valor" v-slot="{ id }"><MoneyInput :id="id" v-model="exp.amount" /></Field>
    <div class="grid grid-cols-2 gap-3">
      <Field label="Data" v-slot="{ id }"><input :id="id" v-model="exp.date" type="date" class="input" /></Field>
      <Field label="Vencimento" v-slot="{ id }"><input :id="id" v-model="exp.dueDate" type="date" class="input" /></Field>
    </div>
    <Field label="Categoria" v-slot="{ id }"><select :id="id" v-model="exp.categoryId" class="input"><option :value="null">Sem categoria</option><option v-for="c in expCats" :key="c.id" :value="c.id">{{ c.name }}</option></select></Field>
    <div class="grid grid-cols-2 gap-3">
      <Field label="Status" v-slot="{ id }"><select :id="id" v-model="exp.status" class="input"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></Field>
      <Field label="Forma de pagamento" v-slot="{ id }"><select :id="id" v-model="exp.paymentMethod" class="input"><option v-for="m in METHODS" :key="m">{{ m }}</option></select></Field>
    </div>
    <Field label="Tipo" hint="Reserva financeira não é gasto: é dinheiro que vai para o patrimônio." v-slot="{ id }"><select :id="id" v-model="exp.kind" class="input"><option value="consumo">Despesa de consumo</option><option value="reserva">Reserva / transferência para patrimônio</option></select></Field>
    <label class="flex items-center gap-3 min-h-[48px] mb-3"><input v-model="exp.recurring" type="checkbox" class="w-5 h-5 accent-brand" />Recorrente</label>
    <Field label="Observação" v-slot="{ id }"><input :id="id" v-model="exp.note" class="input" /></Field>
    <div class="grid gap-3" :class="exp.id ? 'grid-cols-[auto_1fr]' : ''">
      <button v-if="exp.id" class="btn-danger" aria-label="Excluir despesa" @click="delExp"><Trash2 :size="18" /></button>
      <button class="btn-primary" @click="saveExp">Salvar</button>
    </div>
  </Sheet>
</template>
