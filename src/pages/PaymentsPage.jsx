import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, startOfMonth, isAfter } from 'date-fns'
import { usePayments } from '../hooks/usePayments'
import { useClients } from '../hooks/useClients'
import { formatKSh, getVehicleSchedules } from '../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import LottieLoader from '../components/ui/LottieLoader'

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500'

const LABEL = 'text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'

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
    <div className="space-y-4 p-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
            Transactions
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Log and review client payments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className="shrink-0 rounded-xl bg-primary-800 px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Close' : '+ Log'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            This month
          </p>
          <p className="mt-2 break-words text-base font-black text-blue-800">
            {formatKSh(monthTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Total logged
          </p>
          <p className="mt-2 text-base font-black text-slate-950">
            {payments.length}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
        >
          <h2 className="text-sm font-bold text-slate-900">Log payment</h2>

          <div>
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

          <div>
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

          <select
            value={form.method}
            onChange={e => set('method', e.target.value)}
            className={INPUT}
          >
            {METHODS.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Reference e.g. M-Pesa code"
            value={form.reference}
            onChange={e => set('reference', e.target.value)}
            className={INPUT}
          />

          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className={INPUT}
          />

          <textarea
            placeholder="Notes optional"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className={`${INPUT} min-h-16`}
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-primary-800 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save payment'}
          </button>
        </form>
      )}

      {loading ? (
        <LottieLoader label="Loading payments..." />
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          No payments logged yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Recent
          </h2>
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
                    <div className="mt-1 text-[10px] text-slate-400">
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
      )}
    </div>
  )
}
