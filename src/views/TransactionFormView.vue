<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, TriangleAlert, ChevronDown } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { useUiStore } from '@/stores/ui'
import { todayISO, formatMonth, monthRange, addMonths } from '@/utils/dates'
import { allocate, formatMoney, sum } from '@/utils/money'
import { suggestInvoiceMonth } from '@/services/invoices'
import { uid } from '@/utils/id'
import { toast, errMsg } from '@/composables/feedback'
import type { CreditCardTransaction } from '@/types'
import PageHeader from '@/components/PageHeader.vue'
import Field from '@/components/Field.vue'
import MoneyInput from '@/components/MoneyInput.vue'

const d = useDataStore(); const ui = useUiStore(); const route = useRoute(); const router = useRouter()
const editId = route.params.id as string | undefined
const editing = editId ? d.s.transactions.find((t) => t.id === editId) : undefined

const f = reactive({
  description: '', amount: 0, date: todayISO(), kind: 'avista' as 'avista' | 'parcelada', n: 2, current: 1,
  mode: 'total' as 'total' | 'parcela', categoryId: '', note: '', status: 'pendente' as 'pendente' | 'conferida', invoiceMonth: '',
})
const selected = ref<string[]>([d.me?.id ?? ''])
const amounts = reactive<Record<string, number>>({})
const manual = ref(false)
const invoiceTouched = ref(false)
const advanced = ref(false)
const submitted = ref(false)

if (editing) {
  Object.assign(f, {
    description: editing.description, amount: editing.totalAmount, date: editing.date, kind: editing.installments > 1 ? 'parcelada' : 'avista',
    n: editing.installments, current: editing.startNumber, categoryId: editing.categoryId ?? '', note: editing.note, status: editing.status,
    invoiceMonth: editing.firstInvoiceMonth,
  })
  selected.value = editing.splits.map((s) => s.personId)
  for (const s of editing.splits) amounts[s.personId] = s.amount
  manual.value = true; invoiceTouched.value = true
  advanced.value = true
} else {
  f.invoiceMonth = suggestInvoiceMonth(d.card, f.date)
}

function redistribute() {
  const parts = allocate(f.amount, selected.value.map(() => 1))
  selected.value.forEach((id, i) => (amounts[id] = parts[i]))
}
if (!editing) redistribute()
watch(() => f.amount, () => { if (!manual.value || selected.value.length === 1) redistribute() })
watch(selected, () => { manual.value = false; redistribute() }, { deep: true })
watch(() => f.date, (v) => { if (!invoiceTouched.value) f.invoiceMonth = suggestInvoiceMonth(d.card, v) })

function toggle(id: string) {
  const i = selected.value.indexOf(id)
  if (i >= 0) { if (selected.value.length > 1) selected.value.splice(i, 1) } else selected.value.push(id)
}
const distributed = computed(() => sum(selected.value.map((id) => amounts[id] ?? 0)))
const diff = computed(() => f.amount - distributed.value)
const months = computed(() => [...new Set([f.invoiceMonth, ...monthRange(addMonths(d.currentMonth, -2), 16)])].sort())
const cats = computed(() => d.s.categories.filter((c) => c.scope === 'card'))
const parceled = computed(() => f.kind === 'parcelada' && f.n >= 2)
const totalReal = computed(() => (parceled.value && f.mode === 'parcela' ? f.amount * f.n : f.amount))
const errors = computed(() => ({
  description: !f.description.trim() ? 'Informe a descrição.' : '',
  amount: f.amount <= 0 ? 'Informe o valor.' : '',
  split: diff.value !== 0 ? (diff.value > 0 ? `Faltam ${formatMoney(diff.value)} para distribuir.` : `Passou ${formatMoney(-diff.value)} do total.`) : '',
  n: f.kind === 'parcelada' && (f.n < 2 || f.n > 99) ? 'Use de 2 a 99 parcelas.' : '',
  current: parceled.value && (f.current < 1 || f.current > f.n) ? 'Parcela atual inválida.' : '',
}))
const valid = computed(() => Object.values(errors.value).every((e) => !e))

async function save(another: boolean) {
  submitted.value = true
  if (!valid.value) return
  const mult = parceled.value && f.mode === 'parcela' ? f.n : 1
  const tx: CreditCardTransaction = {
    id: editing?.id ?? uid(), cardId: d.card.id, description: f.description.trim(), date: f.date,
    totalAmount: f.amount * mult, installments: parceled.value ? f.n : 1, startNumber: parceled.value ? f.current : 1,
    firstInvoiceMonth: f.invoiceMonth, categoryId: f.categoryId || null, note: f.note, status: f.status,
    splits: selected.value.map((id) => ({ personId: id, amount: (amounts[id] ?? 0) * mult })).filter((s) => s.amount > 0),
    createdAt: editing?.createdAt ?? new Date().toISOString(),
  }
  try {
    await d.saveTransaction(tx)
    toast('Compra salva')
    if (another) { f.description = ''; f.amount = 0; f.note = ''; submitted.value = false; redistribute(); return }
    ui.invoiceMonth = tx.firstInvoiceMonth
    router.replace('/cartao')
  } catch (e) { toast(errMsg(e), 'err') }
}
</script>
<template>
  <PageHeader :title="editing ? 'Editar compra' : 'Nova compra'" back="/cartao" />
  <form class="pb-6" @submit.prevent="save(false)" novalidate>
    <Field label="Descrição" :error="submitted ? errors.description : ''" v-slot="{ id }">
      <input :id="id" v-model="f.description" class="input" autocomplete="off" placeholder="Ex.: Hotel" />
    </Field>
    <Field :label="parceled && f.mode === 'parcela' ? 'Valor da parcela' : parceled ? 'Valor total da compra' : 'Valor'" :error="submitted ? errors.amount : ''" v-slot="{ id }">
      <MoneyInput :id="id" v-model="f.amount" />
    </Field>
    <p v-if="parceled && f.amount" class="-mt-2 mb-4 text-sm text-ink-soft">{{ f.n }}x de {{ formatMoney(f.mode === 'parcela' ? f.amount : Math.floor(f.amount / f.n)) }} · total {{ formatMoney(totalReal) }}</p>

    <p class="label">Responsável</p>
    <div class="flex flex-wrap gap-2 mb-4" role="group" aria-label="Responsáveis">
      <button v-for="p in d.s.people" :key="p.id" type="button" :aria-pressed="selected.includes(p.id)"
        class="min-h-[44px] px-4 rounded-full border font-medium text-[15px] transition" :class="selected.includes(p.id) ? 'bg-brand text-white border-brand' : 'bg-white border-line text-ink'" @click="toggle(p.id)">{{ p.name }}</button>
    </div>

    <div v-if="selected.length > 1" class="card p-4 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="font-semibold">Divisão</p><button type="button" class="text-sm text-brand font-medium" @click="manual = false; redistribute()">Dividir igualmente</button></div>
      <div v-for="id in selected" :key="id" class="flex items-center gap-3 mb-2">
        <span class="w-24 shrink-0 font-medium truncate flex items-center gap-1"><Check v-if="diff === 0" :size="16" class="text-pos" />{{ d.personName(id) }}</span>
        <div class="flex-1"><MoneyInput v-model="amounts[id]" :aria-label="`Valor de ${d.personName(id)}`" @update:model-value="manual = true" /></div>
      </div>
      <div class="text-sm mt-3 pt-3 border-t border-line space-y-0.5">
        <p class="flex justify-between"><span>Total</span><span class="tabular-nums">{{ formatMoney(f.amount) }}</span></p>
        <p class="flex justify-between"><span>Distribuído</span><span class="tabular-nums">{{ formatMoney(distributed) }}</span></p>
        <p class="flex justify-between font-semibold" :class="diff === 0 ? 'text-pos' : 'text-neg'"><span>Diferença</span><span class="tabular-nums">{{ formatMoney(diff) }}</span></p>
        <p v-if="diff !== 0" class="flex items-center gap-1.5 text-neg font-medium pt-1" role="alert"><TriangleAlert :size="16" />{{ errors.split }}</p>
      </div>
    </div>

    <Field label="Fatura" v-slot="{ id }">
      <select :id="id" v-model="f.invoiceMonth" class="input" @change="invoiceTouched = true"><option v-for="m in months" :key="m" :value="m">{{ formatMonth(m) }}</option></select>
    </Field>

    <button type="button" class="flex items-center gap-1 text-brand font-medium mb-3 min-h-[44px]" :aria-expanded="advanced" @click="advanced = !advanced">
      <ChevronDown :size="18" :class="advanced ? 'rotate-180' : ''" class="transition" />Mais opções
    </button>
    <div v-show="advanced">
      <Field label="Data da compra" v-slot="{ id }"><input :id="id" v-model="f.date" type="date" class="input" /></Field>
      <Field label="Tipo" v-slot="{ id }"><select :id="id" v-model="f.kind" class="input"><option value="avista">À vista</option><option value="parcelada">Parcelada</option></select></Field>
      <template v-if="f.kind === 'parcelada'">
        <div class="grid grid-cols-2 gap-3">
          <Field label="Parcelas" :error="submitted ? errors.n : ''" v-slot="{ id }"><input :id="id" v-model.number="f.n" type="number" min="2" max="99" inputmode="numeric" class="input" /></Field>
          <Field label="Parcela atual" :error="submitted ? errors.current : ''" v-slot="{ id }"><input :id="id" v-model.number="f.current" type="number" min="1" :max="f.n" inputmode="numeric" class="input" /></Field>
        </div>
        <Field label="O valor informado é" v-slot="{ id }"><select :id="id" v-model="f.mode" class="input"><option value="total">Total da compra</option><option value="parcela">Valor de cada parcela</option></select></Field>
      </template>
      <Field label="Categoria" v-slot="{ id }"><select :id="id" v-model="f.categoryId" class="input"><option value="">Sem categoria</option><option v-for="c in cats" :key="c.id" :value="c.id">{{ c.name }}</option></select></Field>
      <Field label="Status" v-slot="{ id }"><select :id="id" v-model="f.status" class="input"><option value="pendente">A conferir</option><option value="conferida">Conferida na fatura</option></select></Field>
      <Field label="Observação" v-slot="{ id }"><textarea :id="id" v-model="f.note" rows="2" class="input py-3" /></Field>
    </div>

    <div class="grid gap-3 mt-2" :class="editing ? '' : 'grid-cols-2'">
      <button class="btn-primary" type="submit">Salvar</button>
      <button v-if="!editing" class="btn-soft" type="button" @click="save(true)">Salvar e nova</button>
    </div>
  </form>
</template>
