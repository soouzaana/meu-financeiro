<script setup lang="ts">
import { confirmState, answerConfirm } from '@/composables/feedback'
</script>
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="confirmState.open" class="fixed inset-0 z-[60] flex items-center justify-center p-5" role="alertdialog" aria-modal="true" :aria-label="confirmState.title" @keydown.esc="answerConfirm(false)">
        <div class="absolute inset-0 bg-ink/50" @click="answerConfirm(false)" />
        <div class="sheet-panel relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
          <h2 class="text-lg font-semibold">{{ confirmState.title }}</h2>
          <p v-if="confirmState.message" class="text-ink-soft mt-2 text-[15px]">{{ confirmState.message }}</p>
          <div class="grid grid-cols-2 gap-3 mt-6">
            <button class="btn-ghost" @click="answerConfirm(false)">Cancelar</button>
            <button :class="confirmState.danger ? 'bg-neg text-white btn' : 'btn-primary'" @click="answerConfirm(true)">{{ confirmState.confirmLabel }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
