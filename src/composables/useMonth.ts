import { ref } from 'vue'
import { addMonths, monthOf, todayISO } from '@/utils/dates'
export function useMonth(initial = monthOf(todayISO())) {
  const month = ref(initial)
  return { month, prev: () => (month.value = addMonths(month.value, -1)), next: () => (month.value = addMonths(month.value, 1)) }
}
