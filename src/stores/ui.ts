import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useUiStore = defineStore('ui', () => {
  const invoiceMonth = ref<string | null>(null)
  const personFilter = ref('')
  return { invoiceMonth, personFilter }
})
