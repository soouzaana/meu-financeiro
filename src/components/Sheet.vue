<script setup lang="ts">
import { X } from 'lucide-vue-next'
defineProps<{ modelValue: boolean; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
</script>
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" role="dialog" aria-modal="true" :aria-label="title" @keydown.esc="emit('update:modelValue', false)">
        <div class="absolute inset-0 bg-ink/40" @click="emit('update:modelValue', false)" />
        <div class="sheet-panel relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl max-h-[92dvh] flex flex-col shadow-2xl">
          <div class="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 class="text-[19px] font-semibold">{{ title }}</h2>
            <button class="icon-btn -mr-2" aria-label="Fechar" @click="emit('update:modelValue', false)"><X :size="22" /></button>
          </div>
          <div class="overflow-y-auto px-5 pb-4 flex-1 overscroll-contain" :class="{ 'pb-safe': !$slots.footer }"><slot /></div>
          <div v-if="$slots.footer" class="px-5 pt-3 border-t border-line pb-[max(1rem,env(safe-area-inset-bottom))]"><slot name="footer" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
