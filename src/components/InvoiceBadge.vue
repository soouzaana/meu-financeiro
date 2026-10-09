<script setup lang="ts">
import { computed } from 'vue'
import type { InvoiceStatus } from '@/types'
import Badge from './Badge.vue'
const props = defineProps<{ status: InvoiceStatus }>()
const L: Record<InvoiceStatus, [string, 'neutral' | 'brand' | 'pos' | 'neg' | 'warn']> = {
  aberta: ['Aberta', 'brand'], fechada: ['Fechada', 'neutral'], parcial: ['Paga parcialmente', 'warn'], paga: ['Paga', 'pos'], atrasada: ['Atrasada', 'neg'],
}
const info = computed(() => L[props.status])
</script>
<template><Badge :tone="info[1]">{{ info[0] }}</Badge></template>
