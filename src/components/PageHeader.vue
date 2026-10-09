<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
const props = defineProps<{ title: string; back?: boolean | string }>()
const router = useRouter()
const goBack = () => (typeof props.back === 'string' ? router.push(props.back) : router.back())
</script>
<template>
  <header class="flex items-center justify-between pt-5 pb-3 min-h-[68px]">
    <div class="flex items-center gap-1 min-w-0">
      <button v-if="back" class="icon-btn -ml-3" aria-label="Voltar" @click="goBack"><ChevronLeft :size="26" /></button>
      <h1 class="text-[28px] leading-tight font-bold tracking-tight truncate">{{ title }}</h1>
    </div>
    <div class="flex items-center gap-1 -mr-2"><slot name="actions" /></div>
  </header>
</template>
