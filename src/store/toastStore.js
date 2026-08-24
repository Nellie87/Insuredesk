import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set, get) => ({
  toasts: [],

  showToast: (message, type = 'success') => {
    const id = ++toastId
    set(state => ({
      toasts: [...state.toasts, { id, message, type }],
    }))

    window.setTimeout(() => {
      get().dismissToast(id)
    }, 5000)

    return id
  },

  dismissToast: id => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    }))
  },
}))

export function toast(message, type = 'success') {
  return useToastStore.getState().showToast(message, type)
}
