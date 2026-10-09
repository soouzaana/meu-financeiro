<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'
const props = defineProps<{ v: number; auto?: boolean }>()
const cls = computed(() => (props.auto ? (props.v > 0 ? 'text-pos' : props.v < 0 ? 'text-neg' : '') : ''))
</script>
<template><span class="tabular-nums whitespace-nowrap" :class="cls">{{ formatMoney(v) }}</span></template>
