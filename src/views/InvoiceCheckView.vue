<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CircleCheck, TriangleAlert, Circle, CircleCheckBig } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { useUiStore } from '@/stores/ui'
import { formatMonth } from '@/utils/dates'
import { formatMoney, sum } from '@/utils/money'
import PageHeader from '@/components/PageHeader.vue'
import MonthNav from '@/components/MonthNav.vue'
import Money from '@/components/Money.vue'
import MoneyInput from '@/components/MoneyInput.vue'
import Field from '@/components/Field.vue'
import InvoiceBadge from '@/components/InvoiceBadge.vue'

const d = useDataStore(); const ui = useUiStore(); const route = useRoute()
const month = ref((route.query.m as string) || ui.invoiceMonth || d.currentMonth)
watch(month, (m) => (ui.invoiceMonth = m))
const inv = computed(() => d.summary(month.value))
const real = ref(0)
watch([month, () => inv.value.real], () => { real.value = inv.value.real ?? 0 }, { immediate: true })
function commit() { d.setInvoiceReal(month.value, real.value > 0 ? real.value : null) }

const rows = computed(() => d.s.installments.filter((i) => i.invoiceMonth === month.value).flatMap((i) => {
  const tx = d.s.transactions.find((t) => t.id === i.transactionId)
  return tx ? [{ i, tx }] : []
}).sort((a, b) => b.i.amount - a.i.amount))
const pending = computed(() => rows.value.filter((r) => r.tx.status === 'pendente'))
const people = computed(() => d.s.people.map((p) => ({ p, v: inv.value.byPerson[p.id] ?? 0 })).filter((x) => x.v > 0))
const culprit = computed(() => (inv.value.diff === 0 || inv.value.real === null ? [] : rows.value.filter((r) => r.i.amount === Math.abs(inv.value.diff))))
const toggle = (id: string, st: string) => d.setTxStatus(id, st === 'conferida' ? 'pendente' : 'conferida')
</script>
<template>
  <PageHeader title="Conferir fatura" back="/cartao" />
  <MonthNav v-model="month" />

  <section class="card p-5 mt-3">
    <div class="flex items-center justify-between mb-3"><span class="text-sm text-ink-soft">{{ formatMonth(month) }}</span><InvoiceBadge :status="inv.status" /></div>
    <Field label="Valor da fatura (conforme o banco)" v-slot="{ id }"><MoneyInput :id="id" v-model="real" @update:model-value="commit" /></Field>
    <div class="row"><span>Total das transações lançadas</span><Money :v="inv.launched" class="font-semibold" /></div>
    <div class="row font-bold" :class="inv.real === null ? '' : inv.diff === 0 ? 'text-pos' : 'text-neg'"><span class="flex items-center gap-1.5"><CircleCheck v-if="inv.real !== null && inv.diff === 0" :size="18" />Diferença</span><Money :v="inv.diff" /></div>
  </section>

  <p v-if="inv.real === null" class="text-sm text-ink-soft mt-3 px-1">Informe o valor da fatura do banco para comparar com o que foi lançado.</p>
  <p v-else-if="inv.diff !== 0" class="mt-3 card p-3 flex items-start gap-2 text-sm text-warn font-medium bg-warn/5" role="alert">
    <TriangleAlert :size="18" class="shrink-0 mt-0.5" />
    <span>A fatura possui {{ formatMoney(Math.abs(inv.diff)) }} {{ inv.diff > 0 ? 'não identificados' : 'lançados a mais' }}.
      <template v-if="culprit.length"><br />Mesmo valor de: {{ culprit.map((c) => c.tx.description).join(', ') }}.</template>
      <template v-else-if="inv.diff > 0 && pending.length"><br />{{ pending.length }} compra(s) ainda a conferir ({{ formatMoney(sum(pending.map((p) => p.i.amount))) }}).</template></span>
  </p>
  <p v-else class="mt-3 card p-3 text-sm text-pos font-medium bg-pos/5">Tudo bate: fatura e lançamentos têm o mesmo valor.</p>

  <h2 class="h-section">Por pessoa</h2>
  <div class="card px-4">
    <div v-for="x in people" :key="x.p.id" class="row"><span>{{ x.p.name }}</span><Money :v="x.v" /></div>
    <div class="row font-bold"><span>Total</span><Money :v="sum(people.map((x) => x.v))" /></div>
  </div>

  <h2 class="h-section">Lançamentos <span class="text-ink-faint font-normal text-sm">({{ rows.length - pending.length }}/{{ rows.length }} conferidos)</span></h2>
  <div class="card px-4">
    <div v-for="r in rows" :key="r.i.id" class="row">
      <button class="flex items-center gap-3 min-w-0 text-left min-h-[48px] flex-1" :aria-pressed="r.tx.status === 'conferida'" @click="toggle(r.tx.id, r.tx.status)">
        <CircleCheckBig v-if="r.tx.status === 'conferida'" :size="22" class="text-pos shrink-0" /><Circle v-else :size="22" class="text-ink-faint shrink-0" />
        <span class="min-w-0"><span class="block truncate font-medium">{{ r.tx.description }}</span><span class="block text-[13px] text-ink-soft truncate">{{ r.i.splits.map((s) => d.personName(s.personId)).join(' · ') }}<template v-if="r.tx.installments > 1"> · {{ r.i.number }}/{{ r.i.total }}</template></span></span>
      </button>
      <Money :v="r.i.amount" />
    </div>
  </div>
</template>
