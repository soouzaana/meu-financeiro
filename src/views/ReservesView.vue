<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, ChevronDown, Trash2, Undo2 } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { todayISO, formatDate } from '@/utils/dates'
import { calculateReserveYield } from '@/services/calculations'
import { sum } from '@/utils/money'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import type { MovementType, Reserve } from '@/types'
import PageHeader from '@/components/PageHeader.vue'
import Money from '@/components/Money.vue'
import Badge from '@/components/Badge.vue'
import Sheet from '@/components/Sheet.vue'
import Field from '@/components/Field.vue'
import MoneyInput from '@/components/MoneyInput.vue'
import Empty from '@/components/Empty.vue'

const d = useDataStore(); const route = useRoute(); const router = useRouter()
const expanded = ref<string | null>(null)
const list = computed(() => [...d.s.reserves].sort((a, b) => Number(a.status === 'concluida') - Number(b.status === 'concluida') || b.createdAt.localeCompare(a.createdAt)))
const movs = (id: string) => d.s.reserveMovements.filter((m) => m.reserveId === id).sort((a, b) => b.date.localeCompare(a.date))
const deposited = (id: string) => sum(movs(id).filter((m) => m.type === 'deposito').map((m) => m.amount)) - sum(movs(id).filter((m) => m.type === 'retirada').map((m) => m.amount))
const T = { deposito: 'Depósito', retirada: 'Retirada', rendimento: 'Rendimento' }

/* nova reserva */
const newOpen = ref(false)
const nr = ref({ name: '', purpose: '', transactionId: '', initial: 0, date: todayISO() })
const txs = computed(() => d.s.transactions.map((t) => ({ t, label: `${t.description} — ${t.splits.map((s) => d.personName(s.personId)).join('/')}` })))
function openNew(txId = '') {
  nr.value = { name: '', purpose: '', transactionId: txId, initial: 0, date: todayISO() }
  if (txId) fillFromTx(txId)
  newOpen.value = true
}
function fillFromTx(id: string) {
  const t = d.s.transactions.find((x) => x.id === id)
  if (!t) return
  const who = t.splits.map((s) => d.personName(s.personId)).join('/')
  const inst = d.s.installments.filter((i) => i.transactionId === id).sort((a, b) => a.invoiceMonth.localeCompare(b.invoiceMonth)).find((i) => i.invoiceMonth >= d.currentMonth)
  nr.value.name = `${t.description} - ${who}`
  nr.value.purpose = `Pagar ${t.description} na fatura`
  nr.value.initial = inst?.amount ?? t.totalAmount
}
async function createNew() {
  if (!nr.value.name.trim()) return toast('Dê um nome à reserva.', 'err')
  try { const r = await d.createReserve({ ...nr.value, transactionId: nr.value.transactionId || null }); newOpen.value = false; expanded.value = r.id; toast('Reserva criada') } catch (e) { toast(errMsg(e), 'err') }
}

/* movimentação */
const mvOpen = ref(false)
const mv = ref<{ reserve: Reserve | null; type: MovementType; amount: number; date: string; note: string }>({ reserve: null, type: 'deposito', amount: 0, date: todayISO(), note: '' })
const openMv = (reserve: Reserve, type: MovementType) => { mv.value = { reserve, type, amount: 0, date: todayISO(), note: '' }; mvOpen.value = true }
async function saveMv() {
  try { await d.addMovement(mv.value.reserve!.id, mv.value.type, mv.value.amount, mv.value.date, mv.value.note); mvOpen.value = false; toast('Movimentação registrada') } catch (e) { toast(errMsg(e), 'err') }
}
async function conclude(r: Reserve) {
  if (await askConfirm({ title: 'Concluir reserva?', message: 'O saldo restante volta a ser dinheiro disponível.', confirmLabel: 'Concluir', danger: false })) await d.concludeReserve(r.id, todayISO())
}
async function del(r: Reserve) {
  if (await askConfirm({ title: 'Excluir reserva?', message: 'Todo o histórico dela será apagado.' })) await d.deleteReserve(r.id)
}
async function delMv(id: string) { if (await askConfirm({ title: 'Excluir movimentação?' })) await d.removeMovement(id) }

onMounted(() => { const tx = route.query.tx as string | undefined; if (tx) { openNew(tx); router.replace('/reservas') } })
</script>
<template>
  <PageHeader title="Reservas">
    <template #actions><button class="icon-btn text-brand" aria-label="Nova reserva" @click="openNew()"><Plus :size="26" /></button></template>
  </PageHeader>
  <section class="rounded-3xl bg-brand text-white p-5 shadow-card">
    <p class="text-sm text-white/75">Total reservado</p>
    <p class="text-[34px] font-bold leading-tight"><Money :v="d.reservedBalance" /></p>
    <p class="text-sm text-white/80 mt-2">Rendimento <span class="text-white font-semibold"><Money :v="d.reserveYield" /></span> · Disponível <span class="text-white font-semibold"><Money :v="d.availableBalance" /></span></p>
  </section>

  <Empty v-if="!list.length" text="Separe dinheiro para pagar compras da fatura depois." />
  <div class="space-y-3 mt-4">
    <article v-for="r in list" :key="r.id" class="card p-4" :class="r.status === 'concluida' ? 'opacity-70' : ''">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0"><h2 class="font-semibold truncate">{{ r.name }}</h2><p v-if="r.purpose" class="text-[13px] text-ink-soft">{{ r.purpose }}</p></div>
        <Badge :tone="r.status === 'ativa' ? 'brand' : 'neutral'">{{ r.status === 'ativa' ? 'Ativa' : 'Concluída' }}</Badge>
      </div>
      <p class="text-2xl font-bold mt-2"><Money :v="d.reserveBalance(r.id)" /></p>
      <p class="text-[13px] text-ink-soft">Reservado <Money :v="deposited(r.id)" /> · Rendimento <Money :v="calculateReserveYield(d.s.reserveMovements, r.id)" /></p>
      <div v-if="r.status === 'ativa'" class="grid grid-cols-3 gap-2 mt-3">
        <button class="btn-soft !px-2 text-sm" @click="openMv(r, 'deposito')">Adicionar</button>
        <button class="btn-soft !px-2 text-sm" @click="openMv(r, 'retirada')">Retirar</button>
        <button class="btn-soft !px-2 text-sm" @click="openMv(r, 'rendimento')">Rendimento</button>
      </div>
      <button class="flex items-center gap-1 text-sm text-brand font-medium mt-3 min-h-[40px]" :aria-expanded="expanded === r.id" @click="expanded = expanded === r.id ? null : r.id"><ChevronDown :size="16" :class="expanded === r.id ? 'rotate-180' : ''" class="transition" />Histórico</button>
      <div v-if="expanded === r.id">
        <div v-for="m in movs(r.id)" :key="m.id" class="row text-[15px]">
          <span>{{ T[m.type] }} <span class="text-[13px] text-ink-soft">· {{ formatDate(m.date) }}<template v-if="m.note"> · {{ m.note }}</template></span></span>
          <span class="flex items-center gap-1"><Money :v="m.type === 'retirada' ? -m.amount : m.amount" :auto="m.type === 'retirada'" /><button class="icon-btn !w-9 !h-9" aria-label="Excluir movimentação" @click="delMv(m.id)"><Trash2 :size="16" /></button></span>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <button v-if="r.status === 'ativa'" class="btn-ghost text-sm" @click="conclude(r)">Concluir (usada)</button>
          <button v-else class="btn-ghost text-sm" @click="d.reopenReserve(r.id)"><Undo2 :size="16" />Reabrir</button>
          <button class="btn-danger text-sm" @click="del(r)"><Trash2 :size="16" />Excluir</button>
        </div>
      </div>
    </article>
  </div>

  <Sheet v-model="newOpen" title="Nova reserva">
    <Field label="Compra relacionada (opcional)" v-slot="{ id }">
      <select :id="id" v-model="nr.transactionId" class="input" @change="fillFromTx(nr.transactionId)"><option value="">Nenhuma</option><option v-for="x in txs" :key="x.t.id" :value="x.t.id">{{ x.label }}</option></select>
    </Field>
    <Field label="Nome" v-slot="{ id }"><input :id="id" v-model="nr.name" class="input" placeholder="Ex.: Hotel - Ju" /></Field>
    <Field label="Finalidade" v-slot="{ id }"><input :id="id" v-model="nr.purpose" class="input" /></Field>
    <Field label="Valor inicial" v-slot="{ id }"><MoneyInput :id="id" v-model="nr.initial" /></Field>
    <Field label="Data" v-slot="{ id }"><input :id="id" v-model="nr.date" type="date" class="input" /></Field>
    <button class="btn-primary w-full" @click="createNew">Criar reserva</button>
  </Sheet>

  <Sheet v-model="mvOpen" :title="`${T[mv.type]} · ${mv.reserve?.name ?? ''}`">
    <Field label="Valor" v-slot="{ id }"><MoneyInput :id="id" v-model="mv.amount" /></Field>
    <Field label="Data" v-slot="{ id }"><input :id="id" v-model="mv.date" type="date" class="input" /></Field>
    <Field label="Observação" v-slot="{ id }"><input :id="id" v-model="mv.note" class="input" /></Field>
    <button class="btn-primary w-full" :disabled="mv.amount <= 0" @click="saveMv">Registrar</button>
  </Sheet>
</template>
