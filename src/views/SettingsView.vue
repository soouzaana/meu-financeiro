<script setup lang="ts">
import { ref } from 'vue'
import { Download, Upload, Trash2, FlaskConical } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { askConfirm, toast, errMsg } from '@/composables/feedback'
import { todayISO } from '@/utils/dates'
import PageHeader from '@/components/PageHeader.vue'
import Field from '@/components/Field.vue'
import MoneyInput from '@/components/MoneyInput.vue'
import Money from '@/components/Money.vue'

const d = useDataStore()
const card = ref({ name: d.card.name, closingDay: d.card.closingDay, dueDay: d.card.dueDay })
const balance = ref(d.totalBalance)
const fileEl = ref<HTMLInputElement>()

async function saveCard() {
  const c = card.value
  if (!c.name.trim() || c.closingDay < 1 || c.closingDay > 31 || c.dueDay < 1 || c.dueDay > 31) return toast('Dias devem estar entre 1 e 31.', 'err')
  await d.updateCard({ ...c, name: c.name.trim() }); toast('Cartão atualizado')
}
async function saveBalance() { await d.setTotalBalance(balance.value); toast('Saldo ajustado') }

function exportJson() {
  const blob = new Blob([JSON.stringify(d.exportData(), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = `financeiro-backup-${todayISO()}.json`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  toast('Backup exportado')
}
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]; input.value = ''
  if (!file) return
  try {
    const raw = JSON.parse(await file.text())
    if (!(await askConfirm({ title: 'Substituir todos os dados?', message: 'O backup será validado e os dados atuais serão substituídos.', confirmLabel: 'Importar' }))) return
    await d.importData(raw); balance.value = d.totalBalance; toast('Backup restaurado')
  } catch (err) { toast(err instanceof SyntaxError ? 'Arquivo não é um JSON válido.' : errMsg(err), 'err') }
}
async function wipe() {
  if (!(await askConfirm({ title: 'Apagar todos os dados?', message: 'Isso remove tudo deste aparelho e não pode ser desfeito. Exporte um backup antes.', confirmLabel: 'Apagar tudo' }))) return
  if (!(await askConfirm({ title: 'Tem certeza?', message: 'Última confirmação.', confirmLabel: 'Sim, apagar' }))) return
  await d.wipeAll(); balance.value = 0; toast('Dados apagados')
}
async function demo() {
  if (!(await askConfirm({ title: 'Carregar demonstração?', message: 'Os dados atuais serão substituídos por exemplos.', confirmLabel: 'Carregar', danger: false }))) return
  await d.loadDemo(); balance.value = d.totalBalance; toast('Dados de demonstração carregados')
}
</script>
<template>
  <PageHeader title="Configurações" back />
  <h2 class="h-section !mt-2">Cartão</h2>
  <div class="card p-4">
    <Field label="Nome" v-slot="{ id }"><input :id="id" v-model="card.name" class="input" /></Field>
    <div class="grid grid-cols-2 gap-3">
      <Field label="Dia do fechamento" v-slot="{ id }"><input :id="id" v-model.number="card.closingDay" type="number" min="1" max="31" inputmode="numeric" class="input" /></Field>
      <Field label="Dia do vencimento" v-slot="{ id }"><input :id="id" v-model.number="card.dueDay" type="number" min="1" max="31" inputmode="numeric" class="input" /></Field>
    </div>
    <button class="btn-primary w-full" @click="saveCard">Salvar cartão</button>
  </div>

  <h2 class="h-section">Saldo total em conta</h2>
  <div class="card p-4">
    <p class="text-sm text-ink-soft mb-3">Hoje: <Money :v="d.totalBalance" class="font-semibold text-ink" />. Informe o saldo real para ajustar o ponto de partida.</p>
    <Field label="Saldo total atual" v-slot="{ id }"><MoneyInput :id="id" v-model="balance" /></Field>
    <button class="btn-soft w-full" @click="saveBalance">Ajustar saldo</button>
  </div>

  <h2 class="h-section">Backup</h2>
  <div class="card p-4 grid gap-3">
    <button class="btn-ghost" @click="exportJson"><Download :size="18" />Exportar dados (JSON)</button>
    <button class="btn-ghost" @click="fileEl?.click()"><Upload :size="18" />Importar backup</button>
    <input ref="fileEl" type="file" accept="application/json,.json" class="hidden" aria-label="Arquivo de backup" @change="onFile" />
    <button class="btn-ghost" @click="demo"><FlaskConical :size="18" />Carregar dados de demonstração</button>
    <button class="btn-danger" @click="wipe"><Trash2 :size="18" />Apagar todos os dados</button>
  </div>
  <p class="text-sm text-ink-soft mt-6 px-1">Tudo fica salvo apenas neste aparelho. Para instalar no iPhone: Safari › Compartilhar › Adicionar à Tela de Início. Faça backups com frequência.</p>
</template>
