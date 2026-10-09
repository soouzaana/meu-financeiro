<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, SlidersHorizontal, TriangleAlert, Trash2, ChevronRight, X } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { useUiStore } from '@/stores/ui'
import { todayISO, formatDate, formatMonth } from '@/utils/dates'
import { formatMoney, sum } from '@/utils/money'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import PageHeader from '@/components/PageHeader.vue'
import MonthNav from '@/components/MonthNav.vue'
import Money from '@/components/Money.vue'
import InvoiceBadge from '@/components/InvoiceBadge.vue'
import Sheet from '@/components/Sheet.vue'
import Field from '@/components/Field.vue'
import MoneyInput from '@/components/MoneyInput.vue'
import Badge from '@/components/Badge.vue'
import Empty from '@/components/Empty.vue'

const d = useDataStore(); const ui = useUiStore(); const router = useRouter()
const month = computed({ get: () => ui.invoiceMonth ?? d.currentMonth, set: (v: string) => (ui.invoiceMonth = v) })
const inv = computed(() => d.summary(month.value))

const filters = ref({ category: '', status: '', parcel: '', sort: 'date' })
const filtersOpen = ref(false)
const activeFilters = computed(() => [ui.personFilter, filters.value.category, filters.value.status, filters.value.parcel].filter(Boolean).length)

const rows = computed(() => {
  const list = d.s.installments.filter((i) => i.invoiceMonth === month.value).flatMap((i) => {
    const tx = d.s.transactions.find((t) => t.id === i.transactionId)
    if (!tx) return []
    if (ui.personFilter && !i.splits.some((s) => s.personId === ui.personFilter)) return []
    if (filters.value.category && tx.categoryId !== filters.value.category) return []
    if (filters.value.status && tx.status !== filters.value.status) return []
    if (filters.value.parcel === 'avista' && tx.installments > 1) return []
    if (filters.value.parcel === 'parcelada' && tx.installments === 1) return []
    const shown = ui.personFilter ? i.splits.find((s) => s.personId === ui.personFilter)!.amount : i.amount
    const names = i.splits.map((s) => d.personName(s.personId)).join(' · ')
    return [{ i, tx, shown, names }]
  })
  const f = filters.value.sort
  return list.sort((a, b) =>
    f === 'value' ? b.shown - a.shown : f === 'person' ? a.names.localeCompare(b.names) : f === 'desc' ? a.tx.description.localeCompare(b.tx.description) : b.tx.date.localeCompare(a.tx.date))
})
const people = computed(() => d.s.people.map((p) => ({ p, v: inv.value.byPerson[p.id] ?? 0 })).filter((x) => x.v > 0))
const cardCats = computed(() => d.s.categories.filter((c) => c.scope === 'card'))

function clearFilters() { ui.personFilter = ''; filters.value = { category: '', status: '', parcel: '', sort: 'date' } }
const togglePerson = (id: string) => (ui.personFilter = ui.personFilter === id ? '' : id)

/* abatimento */
const payOpen = ref(false)
const pay = ref({ amount: 0, date: todayISO(), note: '' })
const payments = computed(() => d.s.payments.filter((p) => p.invoiceId === inv.value.invoice.id).sort((a, b) => b.date.localeCompare(a.date)))
function openPay() { pay.value = { amount: 0, date: todayISO(), note: '' }; payOpen.value = true }
async function savePay() {
  try { await d.addPayment(month.value, pay.value.amount, pay.value.date, pay.value.note); pay.value.amount = 0; pay.value.note = ''; toast('Abatimento registrado') }
  catch (e) { toast(errMsg(e), 'err') }
}
async function delPay(id: string) {
  if (await askConfirm({ title: 'Excluir abatimento?', message: 'O valor volta a ficar em aberto na fatura.' })) await d.removePayment(id)
}
const goCheck = () => router.push({ path: '/cartao/conferir', query: { m: month.value } })
</script>
<template>
  <PageHeader title="Cartão">
    <template #actions>
      <button class="icon-btn relative" aria-label="Filtros e ordenação" @click="filtersOpen = true">
        <SlidersHorizontal :size="22" />
        <span v-if="activeFilters" class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand text-white text-[10px] grid place-items-center">{{ activeFilters }}</span>
      </button>
    </template>
  </PageHeader>
  <MonthNav v-model="month" />

  <section class="rounded-3xl bg-brand text-white p-5 mt-3 shadow-card" aria-label="Fatura">
    <div class="flex items-center justify-between"><p class="text-sm text-white/75">Fatura de {{ formatMonth(month) }}</p>
      <span class="bg-white rounded-full"><InvoiceBadge :status="inv.status" /></span></div>
    <p class="text-[38px] leading-tight font-bold mt-0.5"><Money :v="inv.base" /></p>
    <div class="grid grid-cols-3 gap-2 mt-4 text-sm text-white/75">
      <p>Abatido<br /><span class="text-white font-semibold"><Money :v="inv.paid" /></span></p>
      <p>Restante<br /><span class="text-white font-semibold"><Money :v="inv.remaining" /></span></p>
      <p>Vencimento<br /><span class="text-white font-semibold">{{ formatDate(inv.invoice.dueDate) }}</span></p>
    </div>
  </section>
  <p v-if="inv.diff !== 0" class="mt-3 card p-3 flex items-start gap-2 text-sm text-warn font-medium bg-warn/5">
    <TriangleAlert :size="18" class="shrink-0 mt-0.5" /><span>A fatura possui {{ formatMoney(Math.abs(inv.diff)) }} {{ inv.diff > 0 ? 'não identificados' : 'lançados a mais' }}. <button class="underline" @click="goCheck">Conferir</button></span>
  </p>

  <div class="grid grid-cols-2 gap-3 mt-3">
    <RouterLink to="/cartao/nova" class="btn-primary col-span-2"><Plus :size="20" />Nova compra</RouterLink>
    <button class="btn-soft" @click="openPay">Abater fatura</button>
    <button class="btn-soft" @click="goCheck">Conferir fatura</button>
  </div>

  <h2 class="h-section">Por pessoa</h2>
  <div class="card px-4">
    <Empty v-if="!people.length" text="Nenhuma compra nesta fatura." />
    <button v-for="x in people" :key="x.p.id" class="row w-full text-left min-h-[52px]" :aria-pressed="ui.personFilter === x.p.id" @click="togglePerson(x.p.id)">
      <span class="flex items-center gap-2" :class="ui.personFilter === x.p.id ? 'text-brand font-semibold' : ''">{{ x.p.name }}<Badge v-if="ui.personFilter === x.p.id" tone="brand">filtrando</Badge></span>
      <Money :v="x.v" />
    </button>
    <div v-if="people.length" class="row font-bold"><span>Total</span><Money :v="sum(people.map((x) => x.v))" /></div>
  </div>

  <div class="flex items-center justify-between mt-7 mb-2.5 px-1">
    <h2 class="text-[17px] font-semibold">Transações <span class="text-ink-faint font-normal text-sm">({{ rows.length }})</span></h2>
    <button v-if="activeFilters" class="text-sm text-brand font-medium flex items-center gap-1" @click="clearFilters"><X :size="14" />Limpar filtros</button>
  </div>
  <div class="card px-4">
    <Empty v-if="!rows.length" text="Nenhuma transação encontrada." />
    <RouterLink v-for="r in rows" :key="r.i.id" :to="`/cartao/compra/${r.tx.id}`" class="row min-h-[60px]">
      <div class="min-w-0">
        <p class="font-medium truncate">{{ r.tx.description }}</p>
        <p class="text-[13px] text-ink-soft truncate">{{ r.names }}<template v-if="r.tx.installments > 1"> · {{ r.i.number }}/{{ r.i.total }}</template></p>
      </div>
      <div class="flex items-center gap-2"><div class="text-right"><Money :v="r.shown" class="font-semibold" /><p v-if="r.tx.status === 'pendente'" class="text-[11px] text-ink-faint">a conferir</p></div><ChevronRight :size="18" class="text-ink-faint" /></div>
    </RouterLink>
  </div>

  <Sheet v-model="payOpen" title="Abater fatura">
    <p class="text-sm text-ink-soft mb-4">Fatura de {{ formatMonth(month) }} · restante <Money :v="inv.remaining" /></p>
    <Field label="Valor" v-slot="{ id }"><MoneyInput :id="id" v-model="pay.amount" /></Field>
    <Field label="Data" v-slot="{ id }"><input :id="id" v-model="pay.date" type="date" class="input" /></Field>
    <Field label="Observação" v-slot="{ id }"><input :id="id" v-model="pay.note" class="input" placeholder="Opcional" /></Field>
    <button class="btn-primary w-full" :disabled="pay.amount <= 0" @click="savePay">Registrar abatimento</button>
    <h3 class="font-semibold mt-6 mb-1" v-if="payments.length">Abatimentos desta fatura</h3>
    <div v-for="p in payments" :key="p.id" class="row">
      <span><Money :v="p.amount" class="font-semibold" /><span class="text-sm text-ink-soft"> · {{ formatDate(p.date) }}<template v-if="p.note"> · {{ p.note }}</template></span></span>
      <button class="icon-btn" aria-label="Excluir abatimento" @click="delPay(p.id)"><Trash2 :size="18" /></button>
    </div>
    <p v-if="payments.length" class="row font-semibold"><span>Total abatido</span><Money :v="inv.paid" /></p>
  </Sheet>

  <Sheet v-model="filtersOpen" title="Filtros e ordenação">
    <Field label="Pessoa" v-slot="{ id }"><select :id="id" v-model="ui.personFilter" class="input"><option value="">Todas</option><option v-for="p in d.s.people" :key="p.id" :value="p.id">{{ p.name }}</option></select></Field>
    <Field label="Categoria" v-slot="{ id }"><select :id="id" v-model="filters.category" class="input"><option value="">Todas</option><option v-for="c in cardCats" :key="c.id" :value="c.id">{{ c.name }}</option></select></Field>
    <Field label="Status" v-slot="{ id }"><select :id="id" v-model="filters.status" class="input"><option value="">Todos</option><option value="pendente">A conferir</option><option value="conferida">Conferida</option></select></Field>
    <Field label="Parcelamento" v-slot="{ id }"><select :id="id" v-model="filters.parcel" class="input"><option value="">Todos</option><option value="avista">À vista</option><option value="parcelada">Parceladas</option></select></Field>
    <Field label="Ordenar por" v-slot="{ id }"><select :id="id" v-model="filters.sort" class="input"><option value="date">Data</option><option value="value">Valor</option><option value="person">Pessoa</option><option value="desc">Descrição</option></select></Field>
    <div class="grid grid-cols-2 gap-3"><button class="btn-ghost" @click="clearFilters">Limpar</button><button class="btn-primary" @click="filtersOpen = false">Ver resultados</button></div>
  </Sheet>
</template>
