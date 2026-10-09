<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { formatMonth } from '@/utils/dates'
import PageHeader from '@/components/PageHeader.vue'
import Money from '@/components/Money.vue'
import Empty from '@/components/Empty.vue'

const d = useDataStore()
const groups = computed(() => {
  const map = new Map<string, { month: string; items: { id: string; txId: string; label: string; n: string; names: string; amount: number }[]; total: number }>()
  for (const i of d.s.installments.filter((x) => x.invoiceMonth > d.currentMonth).sort((a, b) => a.invoiceMonth.localeCompare(b.invoiceMonth))) {
    const tx = d.s.transactions.find((t) => t.id === i.transactionId)
    if (!tx) continue
    const g = map.get(i.invoiceMonth) ?? { month: i.invoiceMonth, items: [], total: 0 }
    g.items.push({ id: i.id, txId: tx.id, label: tx.description, n: tx.installments > 1 ? `${i.number}/${i.total}` : '', names: i.splits.map((s) => d.personName(s.personId)).join(' · '), amount: i.amount })
    g.total += i.amount
    map.set(i.invoiceMonth, g)
  }
  return [...map.values()].map((g) => ({ ...g, items: g.items.sort((a, b) => b.amount - a.amount) }))
})
</script>
<template>
  <PageHeader title="Próximas faturas" back />
  <Empty v-if="!groups.length" text="Nenhuma parcela futura. Compras parceladas aparecem aqui." />
  <section v-for="g in groups" :key="g.month" class="mb-6">
    <div class="flex items-baseline justify-between px-1 mb-2"><h2 class="font-semibold text-[17px]">{{ formatMonth(g.month) }}</h2><span class="text-sm text-ink-soft">comprometido <Money :v="g.total" class="font-semibold text-ink" /></span></div>
    <div class="card px-4">
      <RouterLink v-for="x in g.items" :key="x.id" :to="`/cartao/compra/${x.txId}`" class="row">
        <span class="min-w-0"><span class="block truncate font-medium">{{ x.label }} <span v-if="x.n" class="text-ink-faint font-normal text-sm">{{ x.n }}</span></span><span class="block text-[13px] text-ink-soft truncate">{{ x.names }}</span></span>
        <Money :v="x.amount" />
      </RouterLink>
    </div>
  </section>
</template>
