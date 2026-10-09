import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [{
    path: '/', component: AppLayout,
    children: [
      { path: '', component: () => import('@/views/HomeView.vue') },
      { path: 'cartao', component: () => import('@/views/CardView.vue') },
      { path: 'cartao/nova', component: () => import('@/views/TransactionFormView.vue') },
      { path: 'cartao/editar/:id', component: () => import('@/views/TransactionFormView.vue') },
      { path: 'cartao/compra/:id', component: () => import('@/views/TransactionDetailView.vue') },
      { path: 'cartao/conferir', component: () => import('@/views/InvoiceCheckView.vue') },
      { path: 'cartao/proximas', component: () => import('@/views/FutureInvoicesView.vue') },
      { path: 'financas', component: () => import('@/views/FinancesView.vue') },
      { path: 'contas', component: () => import('@/views/BillsView.vue') },
      { path: 'mais', component: () => import('@/views/MoreView.vue') },
      { path: 'reservas', component: () => import('@/views/ReservesView.vue') },
      { path: 'emprestimos', component: () => import('@/views/LoansView.vue') },
      { path: 'pessoas', component: () => import('@/views/PeopleView.vue') },
      { path: 'categorias', component: () => import('@/views/CategoriesView.vue') },
      { path: 'config', component: () => import('@/views/SettingsView.vue') },
    ],
  }],
})
