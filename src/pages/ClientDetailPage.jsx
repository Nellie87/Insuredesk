import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useClients } from '../hooks/useClients'
import { usePayments } from '../hooks/usePayments'
import {
  formatKSh,
  getVehicleSchedules,
  getOutstandingBalance,
  getAmountPaid,
  getInstallmentPaidAmount,
  getNextDueInstallment,
} from '../utils/calculator'
import StatusBadge from '../components/ui/StatusBadge'
import LottieLoader from '../components/ui/LottieLoader'

const POLICY_LABELS = {
  comprehensive: 'Comprehensive',
  third_party: 'Third Party',
  third_party_fire_theft: 'Third Party, Fire & Theft',
}

const USE_LABELS = {
  private: 'Private',
  commercial: 'Commercial',
  psv: 'PSV',
}

const METHOD_LABELS = {
  mpesa: 'M-Pesa',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  cheque: 'Cheque',
}

function formatDate(value) {
  if (!value) return '—'

  try {
    return format(parseISO(value), 'd MMM yyyy')
  } catch {
    return value
  }
}

function formatShortDate(value) {
  if (!value) return '—'

  try {
    return format(parseISO(value), 'dd MMM')
  } catch {
    return value
  }
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getProgressPercentage(paid, total) {
  const safePaid = toNumber(paid)
  const safeTotal = toNumber(total)

  if (safeTotal <= 0) return 0

  return Math.min(100, Math.max(0, (safePaid / safeTotal) * 100))
}

function getInitials(name) {
  if (!name) return 'CL'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

function getPaymentMethodStyles(method) {
  switch (method) {
    case 'mpesa':
      return {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
      }

    case 'bank_transfer':
      return {
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
      }

    case 'cash':
      return {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
      }

    case 'cheque':
      return {
        badge: 'border-violet-200 bg-violet-50 text-violet-700',
        dot: 'bg-violet-500',
      }

    default:
      return {
        badge: 'border-slate-200 bg-slate-50 text-slate-700',
        dot: 'bg-slate-400',
      }
  }
}

function getInstallmentStatus(installment) {
  const paidAmount = getInstallmentPaidAmount(installment)
  const amount = toNumber(installment.amount)
  const remaining = Math.max(amount - paidAmount, 0)

  if (installment.paid || (amount > 0 && paidAmount >= amount)) {
    return {
      label: 'Paid',
      paidAmount,
      remaining: 0,
      dotClass: 'bg-emerald-500 ring-emerald-100',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      lineClass: 'bg-emerald-200',
    }
  }

  if (paidAmount > 0) {
    return {
      label: 'Partial',
      paidAmount,
      remaining,
      dotClass: 'bg-blue-500 ring-blue-100',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      lineClass: 'bg-blue-200',
    }
  }

  return {
    label: 'Due',
    paidAmount: 0,
    remaining: amount,
    dotClass: 'bg-amber-500 ring-amber-100',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    lineClass: 'bg-slate-200',
  }
}

function DetailItem({ label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || '—'}
      </dd>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  caption,
  valueClassName = 'text-slate-950',
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-3.5 shadow-card ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-base font-black leading-tight tracking-tight ${valueClassName}`}
      >
        {value}
      </p>

      {caption && (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{caption}</p>
      )}
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
      {children}
    </div>
  )
}

function VehicleCard({ vehicle }) {
  const schedules = getVehicleSchedules(vehicle)
  const schedule = schedules[0] ?? null

  const nextDue = schedule ? getNextDueInstallment(schedule) : null
  const totalPremium = schedule
    ? toNumber(schedule.total_premium ?? vehicle.premium)
    : toNumber(vehicle.premium)

  const amountPaid = schedule ? toNumber(getAmountPaid(schedule)) : 0
  const outstanding = schedule
    ? Math.max(toNumber(getOutstandingBalance(schedule)), 0)
    : totalPremium

  const progress = getProgressPercentage(amountPaid, totalPremium)
  const installments = schedule?.installments ?? []
  const fullyPaid = schedule && outstanding <= 0

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-4 text-white">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Insured vehicle
            </p>

            <h3 className="mt-1.5 break-words text-lg font-black tracking-tight">
              {vehicle.year ? `${vehicle.year} ` : ''}
              {vehicle.make} {vehicle.model}
            </h3>

            <div className="mt-2.5 inline-flex max-w-full rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
              <span className="truncate">
                {vehicle.registration || 'No registration'}
              </span>
            </div>
          </div>

          <div className="min-w-0 border-t border-white/10 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
              Insurer
            </p>
            <p className="mt-1 break-words text-sm font-bold text-white">
              {vehicle.insurer || 'Not specified'}
            </p>

            {vehicle.policy_number && (
              <p className="mt-1 break-all text-xs text-slate-400">
                Policy {vehicle.policy_number}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-400">Cover type</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-800">
              {POLICY_LABELS[vehicle.policy_type] ??
                vehicle.policy_type ??
                'Not specified'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-400">Vehicle use</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-800">
              {USE_LABELS[vehicle.use_type] ??
                vehicle.use_type ??
                'Not specified'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-400">Sum insured</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-800">
              {formatKSh(vehicle.sum_insured ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-400">Annual renewal</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-800">
              {formatDate(vehicle.expiry_date)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Premium
            </p>
            <p className="mt-1.5 break-words text-sm font-black text-slate-950">
              {formatKSh(totalPremium)}
            </p>
          </div>

          <div className="min-w-0 border-l border-slate-100 pl-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Paid
            </p>
            <p className="mt-1.5 break-words text-sm font-black text-emerald-700">
              {formatKSh(amountPaid)}
            </p>
          </div>

          <div className="min-w-0 border-l border-slate-100 pl-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Balance
            </p>
            <p
              className={`mt-1.5 break-words text-sm font-black ${
                fullyPaid ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {formatKSh(outstanding)}
            </p>
          </div>
        </div>

        {schedule && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Payment progress
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fullyPaid
                    ? 'This premium has been fully paid.'
                    : `${Math.round(progress)}% of the premium has been received.`}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                  fullyPaid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {fullyPaid ? 'Fully paid' : `${Math.round(progress)}% paid`}
              </span>
            </div>

            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-label="Premium payment progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fullyPaid ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {nextDue && !fullyPaid && (
              <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                    Next installment
                  </p>
                  <p className="mt-1 text-sm font-semibold text-amber-950">
                    Due {formatDate(nextDue.due_date)}
                  </p>
                </div>

                <p className="break-words text-base font-black text-amber-900">
                  {formatKSh(nextDue.amount)}
                </p>
              </div>
            )}
          </div>
        )}

        {!schedule && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-3.5">
            <p className="text-sm font-semibold text-slate-700">
              No payment schedule has been created.
            </p>
            <p className="mt-1 break-words text-xs text-slate-500">
              The recorded premium is {formatKSh(vehicle.premium ?? 0)}.
            </p>
          </div>
        )}

        {schedule && installments.length > 0 && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900">
                  Installment schedule
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Track each expected premium payment.
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                {installments.length}{' '}
                {installments.length === 1 ? 'installment' : 'installments'}
              </span>
            </div>

            <div className="mt-3">
              {installments.map((installment, index) => {
                const status = getInstallmentStatus(installment)
                const isLast = index === installments.length - 1

                return (
                  <div
                    key={`${installment.number}-${installment.due_date}-${index}`}
                    className="relative flex gap-3"
                  >
                    <div className="flex w-4 shrink-0 flex-col items-center">
                      <span
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ${status.dotClass}`}
                      />

                      {!isLast && (
                        <span
                          className={`my-1 w-0.5 grow ${status.lineClass}`}
                        />
                      )}
                    </div>

                    <div
                      className={`min-w-0 flex-1 ${
                        isLast ? 'pb-0' : 'pb-4'
                      }`}
                    >
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">
                              Installment {installment.number}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Due {formatDate(installment.due_date)}
                            </p>
                          </div>

                          <span
                            className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Expected
                            </p>
                            <p className="mt-1 break-words text-sm font-bold text-slate-800">
                              {formatKSh(installment.amount)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Received
                            </p>
                            <p className="mt-1 break-words text-sm font-bold text-emerald-700">
                              {formatKSh(status.paidAmount)}
                            </p>
                          </div>

                          <div className="col-span-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Remaining
                            </p>
                            <p className="mt-1 break-words text-sm font-bold text-amber-700">
                              {formatKSh(status.remaining)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {schedule?.down_payment_paid && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <p className="break-words text-sm font-semibold text-emerald-800">
              Down payment of {formatKSh(schedule.down_payment)} received
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            Cover started:{' '}
            <strong className="font-semibold text-slate-700">
              {formatDate(vehicle.start_date)}
            </strong>
          </span>

          <span>
            Renewal:{' '}
            <strong className="font-semibold text-slate-700">
              {formatDate(vehicle.expiry_date)}
            </strong>
          </span>
        </div>
      </div>
    </article>
  )
}

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const id = clientId?.replace(/-+$/, '')

  const { clients, loading } = useClients()
  const { payments, loading: paymentsLoading } = usePayments()

  const client = clients.find(item => item.id === id)

  const clientPayments = payments
    .filter(payment => payment.client_id === id)
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))

  if (loading) {
    return <LottieLoader label="Loading client..." />
  }

  if (!client) {
    return (
      <div className="space-y-4 p-4">
        <Link
          to="/clients"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
        >
          ← Back to portfolio
        </Link>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">
            Client not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This client may have been removed or the link may be incorrect.
          </p>
        </div>
      </div>
    )
  }

  const vehicles = client.vehicles ?? []

  const vehicleSummaries = vehicles.map(vehicle => {
    const schedule = getVehicleSchedules(vehicle)[0] ?? null
    const total = schedule
      ? toNumber(schedule.total_premium ?? vehicle.premium)
      : toNumber(vehicle.premium)

    const paid = schedule ? toNumber(getAmountPaid(schedule)) : 0
    const outstanding = schedule
      ? Math.max(toNumber(getOutstandingBalance(schedule)), 0)
      : total

    return {
      total,
      paid,
      outstanding,
    }
  })

  const totalPremium = vehicleSummaries.reduce(
    (sum, item) => sum + item.total,
    0,
  )

  const totalPaid = vehicleSummaries.reduce(
    (sum, item) => sum + item.paid,
    0,
  )

  const totalOutstanding = vehicleSummaries.reduce(
    (sum, item) => sum + item.outstanding,
    0,
  )

  const nextRenewal = vehicles
    .filter(vehicle => vehicle.expiry_date)
    .slice()
    .sort((a, b) =>
      String(a.expiry_date).localeCompare(String(b.expiry_date)),
    )[0]

  const portfolioProgress = getProgressPercentage(totalPaid, totalPremium)

  return (
    <div className="space-y-4 p-4 pb-8">
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-primary-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
        >
          ← Back to portfolio
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 p-4 text-white">
          <div className="flex flex-col gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-base font-black shadow-inner">
                {getInitials(client.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                  Client profile
                </p>

                <h1 className="mt-1 break-words text-xl font-black tracking-tight">
                  {client.name}
                </h1>

                <div className="mt-2 flex flex-col gap-1 text-sm text-white/80">
                  <span className="break-all">
                    {client.phone || 'No phone number'}
                  </span>

                  {client.email && (
                    <span className="break-all">{client.email}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={client.status} />

              <Link
                to="/payments"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-primary-800 shadow-sm transition hover:bg-primary-50"
              >
                Log payment
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-white/70">
              <span>Portfolio payment progress</span>
              <span className="shrink-0">
                {Math.round(portfolioProgress)}% paid
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${portfolioProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <dl className="grid grid-cols-1 gap-4">
            {client.id_number && (
              <DetailItem label="ID number" value={client.id_number} />
            )}

            <DetailItem
              label="Phone number"
              value={client.phone || 'Not provided'}
            />

            {client.email && (
              <DetailItem label="Email address" value={client.email} />
            )}

            {client.address && (
              <DetailItem label="Address" value={client.address} />
            )}
          </dl>

          {client.notes ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Client notes
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {client.notes}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-4">
              <p className="text-sm text-slate-400">
                No notes have been added for this client.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <SummaryCard
          label="Total premium"
          value={formatKSh(totalPremium)}
          caption="Across all policies"
          className="border-blue-100"
          valueClassName="text-blue-800"
        />

        <SummaryCard
          label="Amount paid"
          value={formatKSh(totalPaid)}
          caption="Payments received"
          className="border-emerald-100"
          valueClassName="text-emerald-700"
        />

        <SummaryCard
          label="Outstanding"
          value={formatKSh(totalOutstanding)}
          caption={
            totalOutstanding <= 0
              ? 'No balance remaining'
              : 'Still expected from client'
          }
          className="border-amber-100"
          valueClassName={
            totalOutstanding <= 0 ? 'text-emerald-700' : 'text-amber-700'
          }
        />

        <SummaryCard
          label="Active policies"
          value={vehicles.length}
          caption={
            nextRenewal
              ? `Next renewal ${formatShortDate(nextRenewal.expiry_date)}`
              : 'No renewal date recorded'
          }
          className="border-violet-100"
          valueClassName="text-violet-700"
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
              Portfolio
            </p>

            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
              Vehicles and policies
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review cover details, balances and installment schedules.
            </p>
          </div>

          <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
          </span>
        </div>

        {vehicles.length === 0 ? (
          <EmptyState>No vehicles have been added for this client.</EmptyState>
        ) : (
          <div className="space-y-4">
            {vehicles.map(vehicle => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
              Transactions
            </p>

            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
              Payment history
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              All payments recorded for this client.
            </p>
          </div>

          <Link
            to="/payments"
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800"
          >
            Log payment
          </Link>
        </div>

        {paymentsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
            Loading payments...
          </div>
        ) : clientPayments.length === 0 ? (
          <EmptyState>
            No payments have been logged for this client.
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="divide-y divide-slate-100">
              {clientPayments.map(payment => {
                const vehicle = vehicles.find(
                  item => item.id === payment.vehicle_id,
                )

                const methodStyles = getPaymentMethodStyles(payment.method)

                return (
                  <div
                    key={payment.id}
                    className="space-y-3 px-4 py-4 transition hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${methodStyles.badge}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${methodStyles.dot}`}
                          />
                          {METHOD_LABELS[payment.method] ??
                            payment.method ??
                            'Payment'}
                        </span>

                        <span className="text-xs text-slate-400">
                          {formatDate(payment.date)}
                        </span>
                      </div>

                      {payment.reference && (
                        <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                          Ref: {payment.reference}
                        </p>
                      )}

                      {payment.notes && (
                        <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                          {payment.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-3 border-t border-slate-50 pt-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">
                          Vehicle
                        </p>

                        <p className="mt-1 break-words text-sm font-bold text-slate-800">
                          {vehicle?.registration || 'General client payment'}
                        </p>

                        {vehicle && (
                          <p className="mt-0.5 break-words text-xs text-slate-500">
                            {vehicle.make} {vehicle.model}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-medium text-slate-400">
                          Amount
                        </p>
                        <p className="mt-1 text-base font-black text-emerald-700">
                          {formatKSh(payment.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
