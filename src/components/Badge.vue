<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'brand' | 'pos' | 'neg' | 'warn' }>(), { tone: 'neutral' })
const map = { neutral: 'bg-ink/5 text-ink-soft', brand: 'bg-brand-100 text-brand', pos: 'bg-pos/10 text-pos', neg: 'bg-neg/10 text-neg', warn: 'bg-warn/10 text-warn' }
</script>
<template><span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap" :class="map[tone]"><slot /></span></template>
