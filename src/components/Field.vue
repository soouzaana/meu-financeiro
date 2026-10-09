<script setup lang="ts">
import { useId } from 'vue'
defineProps<{ label: string; error?: string; hint?: string }>()
const id = useId()
</script>
<template>
  <div class="mb-4">
    <label :for="id" class="label">{{ label }}</label>
    <slot :id="id" />
    <p v-if="hint && !error" class="text-xs text-ink-faint mt-1">{{ hint }}</p>
    <p v-if="error" class="text-sm text-neg mt-1" role="alert">{{ error }}</p>
  </div>
</template>
