<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Circle, CircleCheckBig, Trash2, CreditCard } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { useMonth } from '@/composables/useMonth'
import { dateInMonth, formatDate, todayISO, monthOf } from '@/utils/dates'
import { billApplies, billStatus } from '@/services/calculations'
import { sum } from '@/utils/money'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import type { RecurringBill } from '@/types'
import PageHeader from '@/components/PageHeader.vue'
import MonthNav from '@/components/MonthNav.vue'
import Money from '@/components/Money.vue'
import Badge from '@/components/Badge.vue'
import Sheet from '@/components/Sheet.vue'
import Field from '@/components/Field.vue'
import MoneyInput from '@/components/MoneyInput.vue'
import Empty from '@/components/Empty.vue'

const d = useDataStore(); const { month } = useMonth(); const today = todayISO()
const items = computed(() => d.s.bills.filter((b) => billApplies(b, month.value))
  .map((b) => ({ b, status: billStatus(b, month.value, d.s.expenses, today), date: dateInMonth(month.value, b.dueDay) }))
  .sort((x, y) => x.date.localeCompare(y.date)))
const paid = computed(() => sum(items.value.filter((x) => x.status === 'pago').map((x) => x.b.amount)))
const pending = computed(() => sum(items.value.filter((x) => x.status !== 'pago').map((x) => x.b.amount)))
const inv = computed(() => d.summary(month.value))
const cats = computed(() => d.s.categories.filter((c) => c.scope === 'personal'))
const tone = { pago: 'pos', pendente: 'neutral', atrasado: 'neg' } as const
const label = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' } as const

const open = ref(false)
const blank = (): Omit<RecurringBill, 'id'> & { id?: string } => ({ name: '', amount: 0, dueDay: 10, categoryId: null, kind: 'consumo', active: true, startMonth: monthOf(today), note: '' })
const f = ref(blank())
const edit = (b?: RecurringBill) => { f.value = b ? { ...b } : blank(); open.value = true }
async function save() {
  if (!f.value.name.trim() || f.value.amount <= 0 || f.value.dueDay < 1 || f.value.dueDay > 31) return toast('Informe nome, valor e dia (1 a 31).', 'err')
  try { await d.saveBill({ ...f.value, name: f.value.name.trim() }); open.value = false; toast('Conta salva') } catch (e) { toast(errMsg(e), 'err') }
}
async function del() {
  if (f.value.id && await askConfirm({ title: 'Excluir conta?', message: 'Os pagamentos já registrados dela também serão removidos.' })) { await d.deleteBill(f.value.id); open.value = false }
}
</script>
<template>
  <PageHeader title="Contas">
    <template #actions><button class="icon-btn text-brand" aria-label="Nova conta" @click="edit()"><Plus :size="26" /></button></template>
  </PageHeader>
  <MonthNav v-model="month" />
  <div class="grid grid-cols-2 gap-3 mt-3">
    <div class="card p-4"><p class="text-[13px] text-ink-soft">Pago</p><p class="text-lg font-bold text-pos"><Money :v="paid" /></p></div>
    <div class="card p-4"><p class="text-[13px] text-ink-soft">A pagar</p><p class="text-lg font-bold"><Money :v="pending" /></p></div>
  </div>

  <RouterLink v-if="inv.base > 0" to="/cartao" class="card p-4 mt-3 flex items-center justify-between">
    <span class="flex items-center gap-3"><CreditCard :size="22" class="text-brand" /><span><span class="block font-medium">Fatura do cartão</span><span class="text-[13px] text-ink-soft">vence {{ formatDate(inv.invoice.dueDate) }} · restante</span></span></span>
    <Money :v="Math.max(0, inv.remaining)" class="font-semibold" />
  </RouterLink>

  <div class="card px-4 mt-3">
    <Empty v-if="!items.length" text="Cadastre suas contas fixas (faculdade, internet, academia…)." />
    <div v-for="x in items" :key="x.b.id" class="row min-h-[60px]">
      <button class="icon-btn -ml-3" :aria-label="x.status === 'pago' ? `Desfazer pagamento de ${x.b.name}` : `Marcar ${x.b.name} como paga`" @click="d.toggleBillPaid(x.b, month)">
        <CircleCheckBig v-if="x.status === 'pago'" :size="26" class="text-pos" /><Circle v-else :size="26" class="text-ink-faint" /></button>
      <button class="flex-1 min-w-0 text-left" @click="edit(x.b)"><span class="block truncate font-medium">{{ x.b.name }}</span><span class="block text-[13px] text-ink-soft">dia {{ x.b.dueDay }}<template v-if="x.b.kind === 'reserva'"> · reserva</template></span></button>
      <span class="text-right"><Money :v="x.b.amount" class="font-semibold" /><span class="block"><Badge :tone="tone[x.status]">{{ label[x.status] }}</Badge></span></span>
    </div>
  </div>

  <Sheet v-model="open" :title="f.id ? 'Editar conta' : 'Nova conta'">
    <Field label="Nome" v-slot="{ id }"><input :id="id" v-model="f.name" class="input" placeholder="Ex.: Internet" /></Field>
    <div class="grid grid-cols-2 gap-3">
      <Field label="Valor" v-slot="{ id }"><MoneyInput :id="id" v-model="f.amount" /></Field>
      <Field label="Dia do vencimento" v-slot="{ id }"><input :id="id" v-model.number="f.dueDay" type="number" min="1" max="31" inputmode="numeric" class="input" /></Field>
    </div>
    <Field label="Categoria" v-slot="{ id }"><select :id="id" v-model="f.categoryId" class="input"><option :value="null">Sem categoria</option><option v-for="c in cats" :key="c.id" :value="c.id">{{ c.name }}</option></select></Field>
    <Field label="Tipo" hint="Reserva não conta como gasto de consumo no resumo." v-slot="{ id }"><select :id="id" v-model="f.kind" class="input"><option value="consumo">Despesa de consumo</option><option value="reserva">Reserva / transferência para patrimônio</option></select></Field>
    <label class="flex items-center gap-3 min-h-[48px] mb-3"><input v-model="f.active" type="checkbox" class="w-5 h-5 accent-brand" />Conta ativa</label>
    <div class="grid gap-3" :class="f.id ? 'grid-cols-[auto_1fr]' : ''">
      <button v-if="f.id" class="btn-danger" aria-label="Excluir conta" @click="del"><Trash2 :size="18" /></button>
      <button class="btn-primary" @click="save">Salvar</button>
    </div>
  </Sheet>
</template>
