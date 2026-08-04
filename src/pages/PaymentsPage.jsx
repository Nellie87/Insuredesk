import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, startOfMonth, isAfter } from 'date-fns'
import { usePayments } from '../hooks/usePayments'
import { useClients } from '../hooks/useClients'
import { formatKSh, getVehicleSchedules } from '../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500'

const LABEL = 'text-xs font-bold uppercase tracking-[0.1em] text-slate-500'

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
]

const METHOD_LABELS = Object.fromEntries(METHODS.map(m => [m.value, m.label]))

export default function PaymentsPage() {
  const { payments, loading, saving, error, logPayment } = usePayments()
  const { clients, refetch: refetchClients } = useClients()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    clientId: '',
    vehicleId: '',
    amount: '',
    method: 'mpesa',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  })

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const clientOptions = clients.filter(c => (c.vehicles?.length ?? 0) > 0)
  const selectedClient = clients.find(c => c.id === form.clientId)
  const vehicleOptions = selectedClient?.vehicles ?? []

  const monthTotal = useMemo(() => {
    const monthStart = startOfMonth(new Date())
    return payments
      .filter(p => {
        try {
          return (
            isAfter(parseISO(p.date), monthStart) ||
            p.date === format(monthStart, 'yyyy-MM-dd')
          )
        } catch {
          return false
        }
      })
      .reduce((sum, p) => sum + Number(p.amount), 0)
  }, [payments])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.clientId || !form.vehicleId || !parseNumberInput(form.amount)) {
      toast('Client, vehicle, and amount are required.', 'error')
      return
    }

    const vehicle = vehicleOptions.find(v => v.id === form.vehicleId)
    const schedule = vehicle ? getVehicleSchedules(vehicle)[0] : null

    try {
      await logPayment({
        clientId: form.clientId,
        vehicleId: form.vehicleId,
        scheduleId: schedule?.id,
        amount: parseNumberInput(form.amount),
        method: form.method,
        reference: form.reference,
        notes: form.notes,
        date: form.date,
      })
      await refetchClients()

      setForm({
        clientId: '',
        vehicleId: '',
        amount: '',
        method: 'mpesa',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      })
      setShowForm(false)
      toast('Payment logged — portfolio balance updated.')
    } catch (err) {
      toast(err.message || 'Could not log payment.', 'error')
    }
  }

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 lg:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
            Transactions
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Log and review client payments.
          </p>
        </div>
        <p className="hidden text-sm text-slate-500 lg:block">
          Log and review client payments.
        </p>
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className="ml-auto shrink-0 rounded-xl bg-primary-800 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          {showForm ? 'Close' : '+ Log'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            This month
          </p>
          <p className="mt-2 break-words text-base font-black text-blue-800 sm:text-xl">
            {formatKSh(monthTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Total logged
          </p>
          <p className="mt-2 text-base font-black text-slate-950 sm:text-xl">
            {payments.length}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card xl:col-span-2 sm:p-5"
          >
            <h2 className="text-sm font-bold text-slate-900">Log payment</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL}>
                  Client <span className="normal-case text-red-600">*</span>
                </label>
                <select
                  required
                  value={form.clientId}
                  onChange={e => {
                    set('clientId', e.target.value)
                    set('vehicleId', '')
                  }}
                  className={`mt-1.5 ${INPUT}`}
                >
                  <option value="">Select client</option>
                  {clientOptions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={LABEL}>
                  Vehicle <span className="normal-case text-red-600">*</span>
                </label>
                <select
                  required
                  value={form.vehicleId}
                  onChange={e => set('vehicleId', e.target.value)}
                  className={`mt-1.5 ${INPUT}`}
                  disabled={!form.clientId}
                >
                  <option value="">Select vehicle</option>
                  {vehicleOptions.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration} · {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL}>
                  Amount <span className="normal-case text-red-600">*</span>
                </label>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 12,500"
                  value={form.amount}
                  onChange={e => set('amount', formatNumberInput(e.target.value))}
                  className={`mt-1.5 ${INPUT}`}
                />
              </div>

              <div>
                <label className={LABEL}>Method</label>
                <select
                  value={form.method}
                  onChange={e => set('method', e.target.value)}
                  className={`mt-1.5 ${INPUT}`}
                >
                  {METHODS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL}>Reference</label>
                <input
                  placeholder="e.g. M-Pesa code"
                  value={form.reference}
                  onChange={e => set('reference', e.target.value)}
                  className={`mt-1.5 ${INPUT}`}
                />
              </div>

              <div>
                <label className={LABEL}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  className={`mt-1.5 ${INPUT}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={LABEL}>Notes</label>
                <textarea
                  placeholder="Notes optional"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className={`mt-1.5 ${INPUT} min-h-16`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-primary-800 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save payment'}
            </button>
          </form>
        )}

        <div className={showForm ? 'xl:col-span-3' : 'xl:col-span-5'}>
          {loading ? (
            <LottieLoader label="Loading payments..." />
          ) : payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
              No payments logged yet.
            </div>
          ) : (
            <>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Recent
              </h2>

              {/* Mobile cards */}
              <div className="space-y-2.5 lg:hidden">
                {payments.map(payment => {
                  const clientName = payment.clients?.name ?? 'Client'
                  const reg = payment.vehicles?.registration ?? ''
                  return (
                    <Link
                      key={payment.id}
                      to={`/clients/${payment.client_id}`}
                      className="block rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-bold text-slate-900">
                            {clientName}
                          </div>
                          <div className="mt-0.5 break-words text-xs text-slate-500">
                            {reg && `${reg} · `}
                            {METHOD_LABELS[payment.method] ?? payment.method}
                            {payment.reference && ` · ${payment.reference}`}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {format(parseISO(payment.date), 'd MMM yyyy')}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-black text-emerald-700">
                          {formatKSh(payment.amount)}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(payment => (
                      <tr
                        key={payment.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/clients/${payment.client_id}`}
                            className="font-bold text-slate-900 hover:text-primary-800"
                          >
                            {payment.clients?.name ?? 'Client'}
                          </Link>
                          {payment.reference && (
                            <div className="mt-0.5 text-xs text-slate-400">
                              {payment.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {payment.vehicles?.registration ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {METHOD_LABELS[payment.method] ?? payment.method}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {format(parseISO(payment.date), 'd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-700">
                          {formatKSh(payment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
