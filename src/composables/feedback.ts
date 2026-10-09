import { reactive } from 'vue'

export const confirmState = reactive({
  open: false, title: '', message: '', confirmLabel: 'Excluir', danger: true,
  resolve: null as null | ((v: boolean) => void),
})
export function askConfirm(o: { title: string; message?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  Object.assign(confirmState, { open: true, title: o.title, message: o.message ?? '', confirmLabel: o.confirmLabel ?? 'Excluir', danger: o.danger ?? true })
  return new Promise((res) => { confirmState.resolve = res })
}
export function answerConfirm(v: boolean) {
  confirmState.open = false
  confirmState.resolve?.(v)
  confirmState.resolve = null
}

export const toastState = reactive({ msg: '', kind: 'ok' as 'ok' | 'err', n: 0 })
let timer: ReturnType<typeof setTimeout> | undefined
export function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  toastState.msg = msg; toastState.kind = kind; toastState.n++
  clearTimeout(timer)
  timer = setTimeout(() => { toastState.msg = '' }, kind === 'err' ? 5000 : 2200)
}
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
