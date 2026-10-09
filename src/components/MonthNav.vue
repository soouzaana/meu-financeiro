<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { addMonths, formatMonth } from '@/utils/dates'
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <div class="flex items-center justify-between card px-1 py-1">
    <button class="icon-btn" aria-label="Mês anterior" @click="emit('update:modelValue', addMonths(props.modelValue, -1))"><ChevronLeft :size="22" /></button>
    <span class="font-semibold">{{ formatMonth(modelValue) }}</span>
    <button class="icon-btn" aria-label="Próximo mês" @click="emit('update:modelValue', addMonths(props.modelValue, 1))"><ChevronRight :size="22" /></button>
  </div>
</template>
