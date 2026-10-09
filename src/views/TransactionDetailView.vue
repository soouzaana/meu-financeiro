<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Trash2, PiggyBank, Check } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { formatDateFull, formatMonth } from '@/utils/dates'
import { askConfirm } from '@/composables/feedback'
import PageHeader from '@/components/PageHeader.vue'
import Money from '@/components/Money.vue'
import Badge from '@/components/Badge.vue'

const d = useDataStore(); const route = useRoute(); const router = useRouter()
const tx = computed(() => d.s.transactions.find((t) => t.id === route.params.id))
const insts = computed(() => d.s.installments.filter((i) => i.transactionId === tx.value?.id).sort((a, b) => a.number - b.number))
const cur = computed(() => insts.value.find((i) => i.invoiceMonth >= d.currentMonth) ?? insts.value[0])
const remaining = computed(() => insts.value.filter((i) => i.invoiceMonth > (cur.value?.invoiceMonth ?? '')).length)
const reserves = computed(() => d.s.reserves.filter((r) => r.transactionId === tx.value?.id))

async function del() {
  if (!tx.value) return
  if (await askConfirm({ title: 'Excluir compra?', message: 'A compra e todas as parcelas futuras serão removidas das faturas.' })) {
    await d.deleteTransaction(tx.value.id); router.replace('/cartao')
  }
}
</script>
<template>
  <PageHeader title="Compra" back="/cartao" />
  <p v-if="!tx" class="text-ink-soft">Compra não encontrada.</p>
  <template v-else>
    <section class="card p-5">
      <div class="flex items-start justify-between gap-2"><h2 class="text-xl font-bold">{{ tx.description }}</h2>
        <button class="shrink-0" :aria-label="tx.status === 'conferida' ? 'Marcar como a conferir' : 'Marcar como conferida'" @click="d.setTxStatus(tx.id, tx.status === 'conferida' ? 'pendente' : 'conferida')">
          <Badge :tone="tx.status === 'conferida' ? 'pos' : 'neutral'"><Check v-if="tx.status === 'conferida'" :size="12" class="mr-1" />{{ tx.status === 'conferida' ? 'Conferida' : 'A conferir' }}</Badge></button></div>
      <p class="text-sm text-ink-soft mt-1">{{ formatDateFull(tx.date) }} · {{ d.categoryName(tx.categoryId) }}</p>
      <p class="text-3xl font-bold mt-3"><Money :v="tx.totalAmount" /></p>
      <p v-if="tx.installments > 1 && cur" class="text-sm text-ink-soft mt-1">{{ tx.installments }}x de <Money :v="cur.amount" /> · fatura atual: parcela {{ cur.number }}/{{ tx.installments }}<template v-if="remaining"> · próxima {{ cur.number + 1 }}/{{ tx.installments }} · restantes {{ remaining }}</template></p>
      <p v-if="tx.note" class="text-sm mt-3 text-ink-soft">{{ tx.note }}</p>
    </section>

    <h2 class="h-section">Responsáveis</h2>
    <div class="card px-4">
      <div v-for="s in tx.splits" :key="s.personId" class="row"><span>{{ d.personName(s.personId) }}</span><Money :v="s.amount" /></div>
    </div>

    <h2 class="h-section">Parcelas</h2>
    <div class="card px-4">
      <div v-for="i in insts" :key="i.id" class="row"><span>{{ i.number }}/{{ i.total }} <span class="text-sm text-ink-soft">· {{ formatMonth(i.invoiceMonth) }}</span> <Badge v-if="i.id === cur?.id" tone="brand">atual</Badge></span><Money :v="i.amount" /></div>
    </div>

    <h2 v-if="reserves.length" class="h-section">Reservas vinculadas</h2>
    <div v-if="reserves.length" class="card px-4"><div v-for="r in reserves" :key="r.id" class="row"><span>{{ r.name }}</span><Money :v="d.reserveBalance(r.id)" /></div></div>

    <div class="grid grid-cols-2 gap-3 mt-6">
      <RouterLink :to="`/cartao/editar/${tx.id}`" class="btn-ghost"><Pencil :size="18" />Editar</RouterLink>
      <RouterLink :to="{ path: '/reservas', query: { tx: tx.id } }" class="btn-soft"><PiggyBank :size="18" />Reservar</RouterLink>
      <button class="btn-danger col-span-2" @click="del"><Trash2 :size="18" />Excluir compra</button>
    </div>
  </template>
</template>
