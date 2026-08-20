import { create } from 'zustand'

export function mergePaymentLists(...lists) {
  const byId = new Map()
  for (const list of lists) {
    for (const row of list ?? []) {
      if (row?.id) byId.set(row.id, row)
    }
  }
  return [...byId.values()].sort((a, b) => {
    const byDate = String(b.date || '').localeCompare(String(a.date || ''))
    if (byDate) return byDate
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
}

export const usePaymentStore = create(set => ({
  payments: [],
  setPayments: payments => set({ payments }),
  upsertPayment: payment =>
    set(state => ({
      payments: mergePaymentLists(state.payments, [payment]),
    })),
}))
