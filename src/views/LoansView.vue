<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Trash2, ChevronDown } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { todayISO, formatDate, formatDateFull } from '@/utils/dates'
import { calculateLoanPaid, loanStatus } from '@/services/calculations'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import type { Loan } from '@/types'
import PageHeader from '@/components/PageHeader.vue'
import Money from '@/components/Money.vue'
import Badge from '@/components/Badge.vue'
import Sheet from '@/components/Sheet.vue'
import Field from '@/components/Field.vue'
import MoneyInput from '@/components/MoneyInput.vue'
import Empty from '@/components/Empty.vue'

const d = useDataStore(); const today = todayISO()
const list = computed(() => [...d.s.loans].sort((a, b) => Number(d.loanBalance(a) <= 0) - Number(d.loanBalance(b) <= 0) || b.date.localeCompare(a.date)))
const pays = (id: string) => d.s.loanPayments.filter((p) => p.loanId === id).sort((a, b) => b.date.localeCompare(a.date))
const S = { pago: ['Pago', 'pos'], parcial: ['Parcialmente pago', 'warn'], atrasado: ['Atrasado', 'neg'], aberto: ['Em aberto', 'brand'] } as const
const expanded = ref<string | null>(null)

const open = ref(false)
const blank = (): Omit<Loan, 'id'> & { id?: string } => ({ personName: '', amount: 0, date: today, description: '', dueDate: null })
const f = ref(blank())
const edit = (l?: Loan) => { f.value = l ? { ...l } : blank(); open.value = true }
async function save() {
  if (!f.value.personName.trim() || f.value.amount <= 0) return toast('Informe a pessoa e o valor.', 'err')
  try { await d.saveLoan({ ...f.value, personName: f.value.personName.trim(), dueDate: f.value.dueDate || null }); open.value = false; toast('Empréstimo salvo') } catch (e) { toast(errMsg(e), 'err') }
}
async function del() {
  if (f.value.id && await askConfirm({ title: 'Excluir empréstimo?', message: 'Os pagamentos registrados também serão removidos.' })) { await d.deleteLoan(f.value.id); open.value = false }
}

const payOpen = ref(false)
const pay = ref({ loan: null as Loan | null, amount: 0, date: today, note: '' })
const openPay = (l: Loan) => { pay.value = { loan: l, amount: 0, date: today, note: '' }; payOpen.value = true }
async function savePay() {
  try { await d.addLoanPayment({ loanId: pay.value.loan!.id, amount: pay.value.amount, date: pay.value.date, note: pay.value.note }); payOpen.value = false; toast('Pagamento registrado') } catch (e) { toast(errMsg(e), 'err') }
}
async function delPay(id: string) { if (await askConfirm({ title: 'Excluir pagamento?' })) await d.removeLoanPayment(id) }
</script>
<template>
  <PageHeader title="Empréstimos">
    <template #actions><button class="icon-btn text-brand" aria-label="Novo empréstimo" @click="edit()"><Plus :size="26" /></button></template>
  </PageHeader>
  <section class="card p-5"><p class="text-sm text-ink-soft">A receber</p><p class="text-3xl font-bold"><Money :v="d.receivable" /></p></section>
  <Empty v-if="!list.length" text="Nenhum empréstimo registrado." />
  <div class="space-y-3 mt-4">
    <article v-for="l in list" :key="l.id" class="card p-4">
      <div class="flex items-start justify-between gap-2">
        <button class="text-left min-w-0" @click="edit(l)"><h2 class="font-semibold truncate">{{ l.personName }}</h2><p class="text-[13px] text-ink-soft">{{ formatDateFull(l.date) }}<template v-if="l.description"> · {{ l.description }}</template><template v-if="l.dueDate"> · prazo {{ formatDate(l.dueDate) }}</template></p></button>
        <Badge :tone="S[loanStatus(l, d.s.loanPayments, today)][1]">{{ S[loanStatus(l, d.s.loanPayments, today)][0] }}</Badge>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-3 text-sm text-ink-soft">
        <p>Emprestado<br /><span class="font-semibold text-ink"><Money :v="l.amount" /></span></p>
        <p>Devolvido<br /><span class="font-semibold text-ink"><Money :v="calculateLoanPaid(d.s.loanPayments, l.id)" /></span></p>
        <p>Restante<br /><span class="font-semibold text-ink"><Money :v="d.loanBalance(l)" /></span></p>
      </div>
      <div class="h-1.5 rounded-full bg-brand-100 mt-3 overflow-hidden"><div class="h-full bg-brand" :style="{ width: Math.min(100, (calculateLoanPaid(d.s.loanPayments, l.id) / l.amount) * 100) + '%' }" /></div>
      <div class="flex items-center justify-between mt-3">
        <button v-if="d.loanBalance(l) > 0" class="btn-soft text-sm !min-h-[44px]" @click="openPay(l)">Registrar pagamento</button><span v-else />
        <button v-if="pays(l.id).length" class="flex items-center gap-1 text-sm text-brand font-medium min-h-[44px]" :aria-expanded="expanded === l.id" @click="expanded = expanded === l.id ? null : l.id"><ChevronDown :size="16" :class="expanded === l.id ? 'rotate-180' : ''" class="transition" />Pagamentos ({{ pays(l.id).length }})</button>
      </div>
      <div v-if="expanded === l.id"><div v-for="p in pays(l.id)" :key="p.id" class="row text-[15px]"><span>{{ formatDate(p.date) }}<span v-if="p.note" class="text-[13px] text-ink-soft"> · {{ p.note }}</span></span><span class="flex items-center gap-1"><Money :v="p.amount" /><button class="icon-btn !w-9 !h-9" aria-label="Excluir pagamento" @click="delPay(p.id)"><Trash2 :size="16" /></button></span></div></div>
    </article>
  </div>

  <Sheet v-model="open" :title="f.id ? 'Editar empréstimo' : 'Novo empréstimo'">
    <Field label="Pessoa" v-slot="{ id }"><input :id="id" v-model="f.personName" list="people-list" class="input" autocomplete="off" /><datalist id="people-list"><option v-for="p in d.s.people.filter((x) => !x.isMe)" :key="p.id" :value="p.name" /></datalist></Field>
    <Field label="Valor emprestado" v-slot="{ id }"><MoneyInput :id="id" v-model="f.amount" /></Field>
    <div class="grid grid-cols-2 gap-3">
      <Field label="Data" v-slot="{ id }"><input :id="id" v-model="f.date" type="date" class="input" /></Field>
      <Field label="Prazo" v-slot="{ id }"><input :id="id" v-model="f.dueDate" type="date" class="input" /></Field>
    </div>
    <Field label="Descrição" v-slot="{ id }"><input :id="id" v-model="f.description" class="input" /></Field>
    <div class="grid gap-3" :class="f.id ? 'grid-cols-[auto_1fr]' : ''">
      <button v-if="f.id" class="btn-danger" aria-label="Excluir empréstimo" @click="del"><Trash2 :size="18" /></button>
      <button class="btn-primary" @click="save">Salvar</button>
    </div>
  </Sheet>
  <Sheet v-model="payOpen" :title="`Pagamento de ${pay.loan?.personName ?? ''}`">
    <p v-if="pay.loan" class="text-sm text-ink-soft mb-4">Restante <Money :v="d.loanBalance(pay.loan)" /></p>
    <Field label="Valor recebido" v-slot="{ id }"><MoneyInput :id="id" v-model="pay.amount" /></Field>
    <Field label="Data" v-slot="{ id }"><input :id="id" v-model="pay.date" type="date" class="input" /></Field>
    <Field label="Observação" v-slot="{ id }"><input :id="id" v-model="pay.note" class="input" /></Field>
    <button class="btn-primary w-full" :disabled="pay.amount <= 0" @click="savePay">Registrar</button>
  </Sheet>
</template>
