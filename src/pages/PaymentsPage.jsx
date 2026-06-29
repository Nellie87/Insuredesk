import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, startOfMonth, isAfter } from 'date-fns'
import { usePayments } from '../hooks/usePayments'
import { useClients } from '../hooks/useClients'
import { formatKSh, getVehicleSchedules } from '../utils/calculator'
import LottieLoader from '../components/ui/LottieLoader'

const INPUT =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
]

const METHOD_LABELS = Object.fromEntries(METHODS.map(m => [m.value, m.label]))

export default function PaymentsPage() {
  const { payments, loading, saving, error, logPayment } = usePayments()
  const { clients } = useClients()

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
          return isAfter(parseISO(p.date), monthStart) || p.date === format(monthStart, 'yyyy-MM-dd')
        } catch {
          return false
        }
      })
      .reduce((sum, p) => sum + Number(p.amount), 0)
  }, [payments])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.clientId || !form.vehicleId || !form.amount) return

    const vehicle = vehicleOptions.find(v => v.id === form.vehicleId)
    const schedule = vehicle ? getVehicleSchedules(vehicle)[0] : null

    await logPayment({
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      scheduleId: schedule?.id,
      amount: form.amount,
      method: form.method,
      reference: form.reference,
      notes: form.notes,
      date: form.date,
    })

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
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">Log and review client payments.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className="bg-primary-800 text-white text-sm px-3 py-1.5 rounded-xl font-semibold"
        >
          {showForm ? 'Close' : '+ Log'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 bg-primary-50 text-primary-800">
          <div className="text-2xl font-bold">{formatKSh(monthTotal)}</div>
          <div className="text-xs font-medium mt-0.5 opacity-80">This month</div>
        </div>
        <div className="rounded-xl p-4 bg-white border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
          <div className="text-xs font-medium text-gray-500 mt-0.5">Total logged</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Log payment</h2>

          <select
            required
            value={form.clientId}
            onChange={e => {
              set('clientId', e.target.value)
              set('vehicleId', '')
            }}
            className={INPUT}
          >
            <option value="">Select client</option>
            {clientOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            required
            value={form.vehicleId}
            onChange={e => set('vehicleId', e.target.value)}
            className={INPUT}
            disabled={!form.clientId}
          >
            <option value="">Select vehicle</option>
            {vehicleOptions.map(v => (
              <option key={v.id} value={v.id}>
                {v.registration} · {v.make} {v.model}
              </option>
            ))}
          </select>

          <input
            required
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            className={INPUT}
          />

          <select
            value={form.method}
            onChange={e => set('method', e.target.value)}
            className={INPUT}
          >
            {METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
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
            className="w-full bg-primary-800 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save payment'}
          </button>
        </form>
      )}

      {loading ? (
        <LottieLoader label="Loading payments..." />
      ) : payments.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-gray-200">
          No payments logged yet.
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase">Recent</h2>
          {payments.map(payment => {
            const clientName = payment.clients?.name ?? 'Client'
            const reg = payment.vehicles?.registration ?? ''
            return (
              <Link
                key={payment.id}
                to={`/clients/${payment.client_id}`}
                className="block bg-white rounded-xl border border-gray-200 p-3"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{clientName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {reg && `${reg} · `}
                      {METHOD_LABELS[payment.method] ?? payment.method}
                      {payment.reference && ` · ${payment.reference}`}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {format(parseISO(payment.date), 'd MMM yyyy')}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-success-700">
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
