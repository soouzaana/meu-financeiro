<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import type { Category, CategoryScope } from '@/types'
import PageHeader from '@/components/PageHeader.vue'
import Sheet from '@/components/Sheet.vue'
import Field from '@/components/Field.vue'

const d = useDataStore()
const tabs: { id: CategoryScope; label: string }[] = [{ id: 'card', label: 'Cartão' }, { id: 'personal', label: 'Finanças' }, { id: 'income', label: 'Receitas' }]
const scope = ref<CategoryScope>('card')
const list = computed(() => d.s.categories.filter((c) => c.scope === scope.value).sort((a, b) => a.name.localeCompare(b.name)))
const open = ref(false)
const f = ref<{ id?: string; name: string }>({ name: '' })
const edit = (c?: Category) => { f.value = c ? { id: c.id, name: c.name } : { name: '' }; open.value = true }
async function save() {
  if (!f.value.name.trim()) return toast('Informe o nome.', 'err')
  try { await d.saveCategory({ ...f.value, scope: scope.value }); open.value = false } catch (e) { toast(errMsg(e), 'err') }
}
async function del() {
  if (await askConfirm({ title: `Excluir "${f.value.name}"?`, message: 'Itens que usam esta categoria ficam "Sem categoria".' })) { await d.deleteCategory(f.value.id!); open.value = false }
}
</script>
<template>
  <PageHeader title="Categorias" back>
    <template #actions><button class="icon-btn text-brand" aria-label="Nova categoria" @click="edit()"><Plus :size="26" /></button></template>
  </PageHeader>
  <div class="grid grid-cols-3 gap-1 bg-brand-100 rounded-xl p-1" role="tablist">
    <button v-for="t in tabs" :key="t.id" role="tab" :aria-selected="scope === t.id" class="min-h-[44px] rounded-lg font-semibold text-sm" :class="scope === t.id ? 'bg-white text-brand shadow-sm' : 'text-ink-soft'" @click="scope = t.id">{{ t.label }}</button>
  </div>
  <div class="card px-4 mt-3">
    <div v-for="c in list" :key="c.id" class="row min-h-[52px]"><span>{{ c.name }}</span><button class="icon-btn" :aria-label="`Editar ${c.name}`" @click="edit(c)"><Pencil :size="18" /></button></div>
  </div>
  <Sheet v-model="open" :title="f.id ? 'Editar categoria' : 'Nova categoria'">
    <Field label="Nome" v-slot="{ id }"><input :id="id" v-model="f.name" class="input" autocomplete="off" @keydown.enter="save" /></Field>
    <div class="grid gap-3" :class="f.id ? 'grid-cols-[auto_1fr]' : ''">
      <button v-if="f.id" class="btn-danger" aria-label="Excluir categoria" @click="del"><Trash2 :size="18" /></button>
      <button class="btn-primary" @click="save">Salvar</button>
    </div>
  </Sheet>
</template>
