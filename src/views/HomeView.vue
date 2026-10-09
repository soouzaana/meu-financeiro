<script setup lang="ts">
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { todayISO, monthOf, formatDate, formatMonth } from '@/utils/dates'
import { sum } from '@/utils/money'
import PageHeader from '@/components/PageHeader.vue'
import Money from '@/components/Money.vue'
import InvoiceBadge from '@/components/InvoiceBadge.vue'
import Empty from '@/components/Empty.vue'

const d = useDataStore()
const today = todayISO()
const month = monthOf(today)
const inv = computed(() => d.summary(d.currentMonth))
const ms = computed(() => d.monthSummary(month))
const dues = computed(() => d.upcoming(month).slice(0, 7))
const people = computed(() => d.s.people.map((p) => ({ p, v: inv.value.byPerson[p.id] ?? 0 })).filter((x) => x.v > 0))
const loans = computed(() => d.s.loans.filter((l) => d.loanBalance(l) > 0))
const hasData = computed(() => d.s.transactions.length || d.s.incomes.length || d.s.bills.length)
</script>
<template>
  <PageHeader title="Início" />

  <section class="rounded-3xl bg-brand text-white p-5 shadow-card" aria-label="Saldo disponível">
    <p class="text-sm text-white/75">Disponível de verdade</p>
    <p class="text-[38px] leading-tight font-bold tabular-nums mt-0.5"><Money :v="d.availableBalance" /></p>
    <div class="mt-3 flex gap-6 text-sm text-white/80">
      <p>Saldo total<br /><span class="text-white font-semibold"><Money :v="d.totalBalance" /></span></p>
      <p>Reservado<br /><span class="text-white font-semibold"><Money :v="d.reservedBalance" /></span></p>
    </div>
  </section>

  <div class="grid grid-cols-2 gap-3 mt-3">
    <RouterLink to="/emprestimos" class="card p-4"><p class="text-[13px] text-ink-soft">A receber</p><p class="text-xl font-bold mt-1"><Money :v="d.receivable" /></p></RouterLink>
    <RouterLink to="/contas" class="card p-4"><p class="text-[13px] text-ink-soft">A pagar</p><p class="text-xl font-bold mt-1"><Money :v="d.amountDue(month)" /></p></RouterLink>
  </div>

  <Empty v-if="!hasData" text="Nada lançado ainda. Comece pelo cartão, ou carregue os dados de demonstração em Mais › Configurações." />

  <h2 class="h-section">Resumo de {{ formatMonth(month) }}</h2>
  <div class="card px-4">
    <div class="row"><span>Receitas</span><Money :v="ms.income" /></div>
    <div class="row"><span>Despesas <span class="text-xs text-ink-faint">(inclui minha parte do cartão)</span></span><Money :v="ms.expenses" /></div>
    <div class="row"><span>Reservas <span class="text-xs text-ink-faint">(patrimônio)</span></span><Money :v="ms.reserves" /></div>
    <div class="row font-semibold"><span>Saldo projetado</span><Money :v="ms.projected" auto /></div>
  </div>

  <h2 class="h-section">Cartão</h2>
  <RouterLink to="/cartao" class="card p-4 block">
    <div class="flex items-center justify-between"><span class="text-sm text-ink-soft">Fatura de {{ formatMonth(inv.month) }}</span><InvoiceBadge :status="inv.status" /></div>
    <p class="text-3xl font-bold mt-1"><Money :v="inv.base" /></p>
    <div class="grid grid-cols-3 gap-2 mt-3 text-sm">
      <p class="text-ink-soft">Já abatido<br /><span class="font-semibold text-ink"><Money :v="inv.paid" /></span></p>
      <p class="text-ink-soft">Restante<br /><span class="font-semibold text-ink"><Money :v="inv.remaining" /></span></p>
      <p class="text-ink-soft">Vencimento<br /><span class="font-semibold text-ink">{{ formatDate(inv.invoice.dueDate) }}</span></p>
    </div>
    <p v-if="inv.diff !== 0" class="mt-3 flex items-center gap-2 text-sm text-warn font-medium"><TriangleAlert :size="16" />A fatura possui <Money :v="Math.abs(inv.diff)" /> {{ inv.diff > 0 ? 'não identificados' : 'lançados a mais' }}.</p>
  </RouterLink>

  <h2 class="h-section">Quanto cada pessoa deve</h2>
  <div class="card px-4">
    <Empty v-if="!people.length" text="Nenhuma compra nesta fatura." />
    <div v-for="x in people" :key="x.p.id" class="row"><span>{{ x.p.name }}</span><Money :v="x.v" /></div>
    <div v-if="people.length" class="row font-bold"><span>Total</span><Money :v="sum(people.map((x) => x.v))" /></div>
  </div>

  <h2 class="h-section">Próximos vencimentos</h2>
  <div class="card px-4">
    <Empty v-if="!dues.length" text="Nada pendente. 🎉" />
    <div v-for="x in dues" :key="x.key" class="row">
      <span class="flex items-center gap-2 min-w-0"><span class="tabular-nums text-sm w-11 shrink-0" :class="x.overdue ? 'text-neg font-semibold' : 'text-ink-soft'">{{ formatDate(x.date) }}</span><span class="truncate">{{ x.label }}</span></span>
      <Money :v="x.amount" />
    </div>
  </div>

  <h2 class="h-section">Empréstimos</h2>
  <RouterLink to="/emprestimos" class="card px-4 block">
    <div class="row font-semibold"><span>A receber</span><Money :v="d.receivable" /></div>
    <div v-for="l in loans" :key="l.id" class="row text-[15px]"><span>{{ l.personName }}</span><Money :v="d.loanBalance(l)" /></div>
  </RouterLink>

  <h2 class="h-section">Dinheiro reservado</h2>
  <RouterLink to="/reservas" class="card px-4 block">
    <div class="row"><span>Total reservado</span><Money :v="d.reservedBalance" /></div>
    <div class="row"><span>Rendimento</span><Money :v="d.reserveYield" /></div>
  </RouterLink>
</template>
