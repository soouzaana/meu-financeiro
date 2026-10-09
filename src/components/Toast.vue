<script setup lang="ts">
import { toastState } from '@/composables/feedback'
</script>
<template>
  <div class="fixed left-0 right-0 top-0 z-[70] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none" role="status" aria-live="polite">
    <Transition name="sheet">
      <div v-if="toastState.msg" :key="toastState.n" class="sheet-panel pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-[15px] font-medium shadow-xl whitespace-pre-line"
        :class="toastState.kind === 'err' ? 'bg-neg text-white' : 'bg-ink text-white'">{{ toastState.msg }}</div>
    </Transition>
  </div>
</template>
