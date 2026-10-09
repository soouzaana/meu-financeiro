// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { router } from '@/router'
import { useDataStore } from '@/stores/data'

describe('renderização de todas as telas (com demo)', () => {
  it('monta sem erros nem warnings do Vue', async () => {
    const pinia = createPinia(); setActivePinia(pinia)
    const d = useDataStore(); await d.init(); await d.loadDemo()
    const warn = vi.spyOn(console, 'warn'); const err = vi.spyOn(console, 'error')
    const w = mount(App, { global: { plugins: [pinia, router] }, attachTo: document.body })
    const id = d.s.transactions.find((t) => t.description === 'Hotel')!.id
    const paths = ['/', '/cartao', '/cartao/nova', `/cartao/editar/${id}`, `/cartao/compra/${id}`, '/cartao/conferir', '/cartao/proximas',
      '/financas', '/contas', '/mais', '/reservas', '/emprestimos', '/pessoas', '/categorias', '/config']
    for (const p of paths) {
      await router.push(p); await flushPromises(); await flushPromises()
      expect(w.html().length, p).toBeGreaterThan(200)
    }
    await router.push('/'); await flushPromises(); await flushPromises()
    const t = w.text()
    expect(t).toContain('Disponível de verdade')
    expect(t).toContain('Mãe')
    expect(t).toContain('1.595,32')
    await router.push('/cartao/conferir'); await flushPromises(); await flushPromises()
    expect(w.text()).toContain('Tudo bate')
    expect(warn.mock.calls.map(String).join('\n')).toBe('')
    expect(err.mock.calls.map(String).join('\n')).toBe('')
  })
})
