<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { House, CreditCard, Wallet, ListChecks, Ellipsis, PiggyBank, HandCoins, Users, Tags, Settings, CalendarRange } from 'lucide-vue-next'

const route = useRoute()
const main = [
  { to: '/', label: 'Início', icon: House, match: (p: string) => p === '/' },
  { to: '/cartao', label: 'Cartão', icon: CreditCard, match: (p: string) => p.startsWith('/cartao') },
  { to: '/financas', label: 'Finanças', icon: Wallet, match: (p: string) => p.startsWith('/financas') },
  { to: '/contas', label: 'Contas', icon: ListChecks, match: (p: string) => p.startsWith('/contas') },
]
const more = [
  { to: '/reservas', label: 'Reservas', icon: PiggyBank },
  { to: '/emprestimos', label: 'Empréstimos', icon: HandCoins },
  { to: '/cartao/proximas', label: 'Próximas faturas', icon: CalendarRange },
  { to: '/pessoas', label: 'Pessoas', icon: Users },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/config', label: 'Configurações', icon: Settings },
]
const moreActive = computed(() => !main.some((m) => m.match(route.path)))
const active = (m: { match: (p: string) => boolean }) => m.match(route.path)
</script>
<template>
  <div class="min-h-dvh md:flex">
    <aside class="hidden md:flex flex-col w-64 shrink-0 border-r border-line bg-white px-3 py-6 sticky top-0 h-dvh overflow-y-auto">
      <p class="px-3 mb-6 text-lg font-bold text-brand">Meu Financeiro</p>
      <nav class="flex flex-col gap-1" aria-label="Principal">
        <RouterLink v-for="m in main" :key="m.to" :to="m.to" class="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium" :class="active(m) ? 'bg-brand-100 text-brand' : 'text-ink-soft hover:bg-brand-50'">
          <component :is="m.icon" :size="20" />{{ m.label }}
        </RouterLink>
        <div class="h-px bg-line my-3" />
        <RouterLink v-for="m in more" :key="m.to" :to="m.to" class="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium" :class="route.path === m.to ? 'bg-brand-100 text-brand' : 'text-ink-soft hover:bg-brand-50'">
          <component :is="m.icon" :size="20" />{{ m.label }}
        </RouterLink>
      </nav>
    </aside>
    <main class="flex-1 min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
      <div class="px-4 md:px-8 max-w-3xl mx-auto"><RouterView /></div>
    </main>
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line pb-safe" aria-label="Principal">
      <ul class="grid grid-cols-5">
        <li v-for="m in main" :key="m.to">
          <RouterLink :to="m.to" class="flex flex-col items-center justify-center gap-0.5 min-h-[58px] text-[11px] font-medium" :class="active(m) ? 'text-brand' : 'text-ink-faint'">
            <span class="px-4 py-1 rounded-full" :class="active(m) ? 'bg-brand-100' : ''"><component :is="m.icon" :size="22" :stroke-width="active(m) ? 2.4 : 2" /></span>{{ m.label }}
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/mais" class="flex flex-col items-center justify-center gap-0.5 min-h-[58px] text-[11px] font-medium" :class="moreActive ? 'text-brand' : 'text-ink-faint'">
            <span class="px-4 py-1 rounded-full" :class="moreActive ? 'bg-brand-100' : ''"><Ellipsis :size="22" /></span>Mais
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
