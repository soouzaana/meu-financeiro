<script setup lang="ts">
import { PiggyBank, HandCoins, Users, Tags, Settings, CalendarRange, ChevronRight } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
const items = [
  { to: '/reservas', label: 'Reservas (caixinha)', icon: PiggyBank },
  { to: '/emprestimos', label: 'Empréstimos', icon: HandCoins },
  { to: '/cartao/proximas', label: 'Próximas faturas', icon: CalendarRange },
  { to: '/pessoas', label: 'Pessoas do cartão', icon: Users },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/config', label: 'Backup e configurações', icon: Settings },
]
</script>
<template>
  <PageHeader title="Mais" />
  <div class="card px-4">
    <RouterLink v-for="i in items" :key="i.to" :to="i.to" class="row min-h-[56px]">
      <span class="flex items-center gap-3 font-medium"><component :is="i.icon" :size="22" class="text-brand" />{{ i.label }}</span>
      <ChevronRight :size="20" class="text-ink-faint" />
    </RouterLink>
  </div>
</template>
