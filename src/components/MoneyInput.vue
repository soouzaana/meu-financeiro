<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ modelValue: number; id?: string; placeholder?: string; ariaLabel?: string }>()
const emit = defineEmits<{ 'update:modelValue': [number] }>()
const fmt = (c: number) => (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const display = computed(() => (props.modelValue ? fmt(props.modelValue) : ''))
function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 11)
  const v = digits ? parseInt(digits, 10) : 0
  emit('update:modelValue', v)
  el.value = v ? fmt(v) : ''
}
</script>
<template>
  <div class="relative">
    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint text-[16px] pointer-events-none">R$</span>
    <input :id="id" :value="display" :placeholder="placeholder ?? '0,00'" :aria-label="ariaLabel" inputmode="numeric" autocomplete="off"
      class="input pl-10 tabular-nums" @input="onInput" />
  </div>
</template>
