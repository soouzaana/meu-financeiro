<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { useUiStore } from '@/stores/ui'
import { calculatePersonFuture } from '@/services/calculations'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import type { Person } from '@/types'
import PageHeader from '@/components/PageHeader.vue'
import Money from '@/components/Money.vue'
import Sheet from '@/components/Sheet.vue'
import Field from '@/components/Field.vue'

const d = useDataStore(); const ui = useUiStore(); const router = useRouter()
const open = ref(false)
const f = ref<{ id?: string; name: string; isMe?: boolean }>({ name: '' })
const edit = (p?: Person) => { f.value = p ? { id: p.id, name: p.name, isMe: p.isMe } : { name: '' }; open.value = true }
async function save() {
  if (!f.value.name.trim()) return toast('Informe o nome.', 'err')
  try { await d.savePerson(f.value); open.value = false } catch (e) { toast(errMsg(e), 'err') }
}
async function del() {
  if (!(await askConfirm({ title: `Excluir ${f.value.name}?` }))) return
  try { await d.deletePerson(f.value.id!); open.value = false } catch (e) { toast(errMsg(e), 'err') }
}
const view = (id: string) => { ui.personFilter = id; ui.invoiceMonth = d.currentMonth; router.push('/cartao') }
</script>
<template>
  <PageHeader title="Pessoas" back>
    <template #actions><button class="icon-btn text-brand" aria-label="Nova pessoa" @click="edit()"><Plus :size="26" /></button></template>
  </PageHeader>
  <div class="card px-4">
    <div v-for="p in d.s.people" :key="p.id" class="row min-h-[68px]">
      <button class="text-left flex-1 min-w-0" @click="view(p.id)">
        <span class="block font-medium">{{ p.name }}</span>
        <span class="block text-[13px] text-ink-soft">Fatura atual <Money :v="d.personTotals(d.currentMonth)[p.id] ?? 0" /> · Futuras <Money :v="calculatePersonFuture(d.s.installments, d.currentMonth, p.id)" /></span>
      </button>
      <button class="icon-btn" :aria-label="`Editar ${p.name}`" @click="edit(p)"><Pencil :size="18" /></button>
    </div>
  </div>
  <Sheet v-model="open" :title="f.id ? 'Editar pessoa' : 'Nova pessoa'">
    <Field label="Nome" v-slot="{ id }"><input :id="id" v-model="f.name" class="input" autocomplete="off" @keydown.enter="save" /></Field>
    <div class="grid gap-3" :class="f.id && !f.isMe ? 'grid-cols-[auto_1fr]' : ''">
      <button v-if="f.id && !f.isMe" class="btn-danger" aria-label="Excluir pessoa" @click="del"><Trash2 :size="18" /></button>
      <button class="btn-primary" @click="save">Salvar</button>
    </div>
  </Sheet>
</template>
