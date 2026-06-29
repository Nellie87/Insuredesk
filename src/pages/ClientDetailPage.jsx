import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useClients } from '../hooks/useClients'
import {
  formatKSh,
  getVehicleSchedules,
  getOutstandingBalance,
  getNextDueInstallment,
} from '../utils/calculator'
import StatusBadge from '../components/ui/StatusBadge'
import LottieLoader from '../components/ui/LottieLoader'

const POLICY_LABELS = {
  comprehensive: 'Comprehensive',
  third_party: 'Third Party',
  third_party_fire_theft: 'TPFT',
}

const USE_LABELS = {
  private: 'Private',
  commercial: 'Commercial',
  psv: 'PSV',
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'd MMM yyyy')
  } catch {
    return value
  }
}

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const id = clientId?.replace(/-+$/, '')
  const { clients, loading } = useClients()

  const client = clients.find(c => c.id === id)

  if (loading) {
    return <LottieLoader label="Loading client..." />
  }

  if (!client) {
    return (
      <div className="p-4 space-y-4">
        <Link to="/clients" className="text-sm text-primary-700 font-medium">
          ← Back to portfolio
        </Link>
        <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-gray-200">
          Client not found.
        </div>
      </div>
    )
  }

  const vehicles = client.vehicles ?? []

  return (
    <div className="p-4 space-y-5 pb-8">
      <Link to="/clients" className="text-sm text-primary-700 font-medium">
        ← Back to portfolio
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{client.phone}</p>
          </div>
          <StatusBadge status={client.status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {client.id_number && (
            <div>
              <dt className="text-xs text-gray-400">ID number</dt>
              <dd className="font-medium text-gray-800">{client.id_number}</dd>
            </div>
          )}
          {client.email && (
            <div>
              <dt className="text-xs text-gray-400">Email</dt>
              <dd className="font-medium text-gray-800 break-all">{client.email}</dd>
            </div>
          )}
          {client.address && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-400">Address</dt>
              <dd className="font-medium text-gray-800">{client.address}</dd>
            </div>
          )}
        </dl>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase">
          Vehicles & policies ({vehicles.length})
        </h2>

        {vehicles.length === 0 ? (
          <div className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-200 p-4">
            No vehicles on file.
          </div>
        ) : (
          vehicles.map(vehicle => {
            const schedules = getVehicleSchedules(vehicle)
            const schedule = schedules[0]
            const nextDue = schedule ? getNextDueInstallment(schedule) : null
            const outstanding = schedule ? getOutstandingBalance(schedule) : null

            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {vehicle.year ? `${vehicle.year} ` : ''}
                      {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
                      {vehicle.registration}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary-900">
                      {formatKSh(vehicle.premium)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">annual premium</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Insurer</div>
                    <div className="font-medium text-gray-800">{vehicle.insurer}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Cover</div>
                    <div className="font-medium text-gray-800">
                      {POLICY_LABELS[vehicle.policy_type] ?? vehicle.policy_type}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Use</div>
                    <div className="font-medium text-gray-800">
                      {USE_LABELS[vehicle.use_type] ?? vehicle.use_type}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Sum insured</div>
                    <div className="font-medium text-gray-800">
                      {formatKSh(vehicle.sum_insured ?? 0)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Policy start</div>
                    <div className="font-medium text-gray-800">
                      {formatDate(vehicle.start_date)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Expires</div>
                    <div className="font-medium text-gray-800">
                      {formatDate(vehicle.expiry_date)}
                    </div>
                  </div>
                </div>

                {vehicle.policy_number && (
                  <p className="text-xs text-gray-500">
                    Policy no. <span className="font-medium text-gray-700">{vehicle.policy_number}</span>
                  </p>
                )}

                {schedule && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Payment plan
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Outstanding</span>
                      <span className="font-bold text-gray-900">{formatKSh(outstanding)}</span>
                    </div>
                    {nextDue && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Next due</span>
                        <span className="font-medium text-gray-800">
                          {formatKSh(nextDue.amount)} · {formatDate(nextDue.due_date)}
                        </span>
                      </div>
                    )}
                    {schedule.down_payment_paid && (
                      <div className="text-xs text-success-700 bg-success-50 rounded-lg px-2 py-1.5">
                        Down payment of {formatKSh(schedule.down_payment)} received
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
