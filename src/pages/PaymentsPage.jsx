import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, startOfMonth, isAfter } from 'date-fns'
import { usePayments } from '../hooks/usePayments'
import { useClients } from '../hooks/useClients'
import {
  formatKSh,
  getVehicleSchedules,
  getVehicleCollectionSummary,
} from '../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'
import StatusBadge from '../components/ui/StatusBadge'
import { INPUT, LABEL } from '../constants/formStyles'

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
]

const METHOD_LABELS = Object.fromEntries(METHODS.map(m => [m.value, m.label]))

function vehicleLabel(vehicle) {
  const year = vehicle.year ? `${vehicle.year} ` : ''
  return `${vehicle.registration || 'No Reg'} · ${year}${vehicle.make || ''} ${vehicle.model || ''}`.trim()
}

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
  const multiVehicle = vehicleOptions.length > 1
  const selectedVehicle = vehicleOptions.find(v => v.id === form.vehicleId)

  const clientPayments = useMemo(
    () =>
      payments.filter(
        payment => selectedClient && payment.client_id === selectedClient.id
      ),
    [payments, selectedClient]
  )

  const clientCollection = useMemo(() => {
    if (!selectedClient) return null
    const vehicles = selectedClient.vehicles ?? []
    const summaries = vehicles.map(vehicle =>
      getVehicleCollectionSummary(
        vehicle,
        clientPayments.filter(p => p.vehicle_id === vehicle.id)
      )
    )
    return {
      totalPremium: summaries.reduce((sum, item) => sum + item.totalPremium, 0),
      amountPaid: summaries.reduce((sum, item) => sum + item.amountPaid, 0),
      outstanding: summaries.reduce((sum, item) => sum + item.outstanding, 0),
      overpayment: summaries.reduce((sum, item) => sum + item.overpayment, 0),
      vehicles: summaries.map((summary, index) => ({
        vehicle: vehicles[index],
        ...summary,
      })),
    }
  }, [selectedClient, clientPayments])

  const selectedVehicleSummary = useMemo(() => {
    if (!selectedVehicle) return null
    return getVehicleCollectionSummary(
      selectedVehicle,
      clientPayments.filter(p => p.vehicle_id === selectedVehicle.id)
    )
  }, [selectedVehicle, clientPayments])

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

  const selectClient = clientId => {
    const client = clients.find(c => c.id === clientId)
    const vehicles = client?.vehicles ?? []
    setForm(prev => ({
      ...prev,
      clientId,
      vehicleId: vehicles.length === 1 ? vehicles[0].id : '',
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.clientId || !form.vehicleId || !parseNumberInput(form.amount)) {
      toast('Client, vehicle, and amount are required.', 'error')
      return
    }

    const vehicle = vehicleOptions.find(v => v.id === form.vehicleId)
    const schedule = vehicle ? getVehicleSchedules(vehicle)[0] : null
    const amount = parseNumberInput(form.amount)
    const priorPaid = selectedVehicleSummary?.amountPaid ?? 0
      const premium = selectedVehicleSummary?.totalPremium ?? (Number(vehicle?.premium) || 0)

    try {
      await logPayment({
        clientId: form.clientId,
        vehicleId: form.vehicleId,
        scheduleId: schedule?.id,
        amount,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
        date: form.date,
      })
      await refetchClients()

      const newPaid = priorPaid + amount
      const remaining = Math.max(0, premium - newPaid)
      const overpaid = Math.max(0, newPaid - premium)

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

      if (overpaid > 0.01) {
        toast(
          `Payment logged. Overpayment of ${formatKSh(overpaid)} — confirm credit or refund with the client.`,
          'info'
        )
      } else if (remaining > 0.01) {
        toast(
          `Payment logged. Balance due: ${formatKSh(remaining)} — remind the client before cover lapses.`,
          'info'
        )
      } else {
        toast('Payment logged — portfolio balance updated.')
      }
    } catch (err) {
      toast(err.message || 'Could not log payment.', 'error')
    }
  }

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 lg:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
            Transactions
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
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
          className="ml-auto shrink-0 rounded-xl bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          {showForm ? 'Close' : '+ Log'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            This month
          </p>
          <p className="mt-2 break-words text-base font-bold text-blue-800 sm:text-xl">
            {formatKSh(monthTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Total logged
          </p>
          <p className="mt-2 text-base font-bold text-slate-950 sm:text-xl">
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
            className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card xl:col-span-2 sm:p-5"
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
                  onChange={e => selectClient(e.target.value)}
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
                {!form.clientId ? (
                  <select disabled className={`mt-1.5 ${INPUT}`} value="">
                    <option value="">Select a client first</option>
                  </select>
                ) : multiVehicle ? (
                  <select
                    required
                    value={form.vehicleId}
                    onChange={e => set('vehicleId', e.target.value)}
                    className={`mt-1.5 ${INPUT}`}
                  >
                    <option value="">Select vehicle</option>
                    {vehicleOptions.map(v => (
                      <option key={v.id} value={v.id}>
                        {vehicleLabel(v)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="vehicleId" value={form.vehicleId} />
                    <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                      {vehicleOptions[0]
                        ? vehicleLabel(vehicleOptions[0])
                        : 'No vehicle'}
                    </div>
                  </>
                )}
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
              className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save payment'}
            </button>
          </form>
        )}

        <div className={showForm ? 'xl:col-span-3' : 'xl:col-span-5'}>
          {showForm && selectedClient && clientCollection ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Client details
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      {selectedClient.name}
                    </h2>
                    <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                      {selectedClient.phone && <p>{selectedClient.phone}</p>}
                      {selectedClient.id_number && (
                        <p>ID: {selectedClient.id_number}</p>
                      )}
                      {selectedClient.email && <p>{selectedClient.email}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={selectedClient.status} />
                    <Link
                      to={`/clients/${selectedClient.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Open portfolio →
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Premium
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatKSh(clientCollection.totalPremium)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Collected
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      {formatKSh(clientCollection.amountPaid)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      {clientCollection.overpayment > 0.01 ? 'Overpaid' : 'Balance'}
                    </p>
                    <p
                      className={`mt-1 text-sm font-bold ${
                        clientCollection.overpayment > 0.01
                          ? 'text-sky-700'
                          : clientCollection.outstanding > 0
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                      }`}
                    >
                      {formatKSh(
                        clientCollection.overpayment > 0.01
                          ? clientCollection.overpayment
                          : clientCollection.outstanding
                      )}
                    </p>
                  </div>
                </div>

                {clientCollection.overpayment > 0.01 && (
                  <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs text-sky-800">
                    Overpayment of {formatKSh(clientCollection.overpayment)} — collected
                    exceeds the premium. Confirm whether this is a credit, refund, or
                    next-period payment.
                  </div>
                )}

                {clientCollection.outstanding > 0.01 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-800">
                    Balance due — if they only paid for short cover (e.g. one month),
                    remind them that {formatKSh(clientCollection.outstanding)} is still
                    outstanding on the full premium.
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Vehicles
                  </p>
                  {clientCollection.vehicles.map(({ vehicle, amountPaid, totalPremium, outstanding, overpayment, fullyPaid }) => (
                    <div
                      key={vehicle.id}
                      className={`rounded-xl border px-3 py-2.5 ${
                        form.vehicleId === vehicle.id
                          ? 'border-primary-200 bg-primary-50/50'
                          : 'border-slate-100 bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {vehicle.year ? `${vehicle.year} ` : ''}
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-slate-500">
                            {vehicle.registration || 'No Reg'}
                            {vehicle.insurer ? ` · ${vehicle.insurer}` : ''}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            overpayment > 0.01
                              ? 'bg-sky-50 text-sky-700'
                              : fullyPaid
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {overpayment > 0.01
                            ? 'Overpaid'
                            : fullyPaid
                              ? 'Paid'
                              : 'Balance due'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600">
                        {formatKSh(amountPaid)} / {formatKSh(totalPremium)}
                        {overpayment > 0.01 ? (
                          <span className="text-sky-700">
                            {' '}
                            · {formatKSh(overpayment)} over
                          </span>
                        ) : !fullyPaid ? (
                          <span className="text-amber-700">
                            {' '}
                            · {formatKSh(outstanding)} left
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : loading ? (
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
                      className="block rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card"
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
                        <div className="shrink-0 text-sm font-bold text-emerald-700">
                          {formatKSh(payment.amount)}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="surface-table hidden lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-5 py-3.5">Client</th>
                      <th className="px-5 py-3.5">Vehicle</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(payment => (
                      <tr
                        key={payment.id}
                        className="transition hover:bg-primary-50/40"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/clients/${payment.client_id}`}
                            className="font-semibold text-slate-900 hover:text-primary-600"
                          >
                            {payment.clients?.name ?? 'Client'}
                          </Link>
                          {payment.reference && (
                            <div className="mt-0.5 text-xs text-slate-400">
                              {payment.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {payment.vehicles?.registration ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {METHOD_LABELS[payment.method] ?? payment.method}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {format(parseISO(payment.date), 'd MMM yyyy')}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
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
