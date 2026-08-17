import { useState } from 'react'
import { calculatePolicy, formatKSh } from '../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import { format } from 'date-fns'
import PageShell from '../components/layout/PageShell'
import { INPUT_SPACED as INPUT, LABEL, BTN_PRIMARY } from '../constants/formStyles'

const DEFAULT_INPUT = {
  total_premium: '',
  down_payment_percent: '40',
  installment_months: 3,
  first_payment_date: new Date().toISOString().split('T')[0],
  commission_rate: '12.5',
}

export default function CalculatorPage() {
  const [input, setInput] = useState(DEFAULT_INPUT)
  const [result, setResult] = useState(null)

  const set = (key, value) => setInput(prev => ({ ...prev, [key]: value }))

  const handleCalculate = () => {
    const premium = parseFloat(parseNumberInput(input.total_premium))
    if (!premium || premium <= 0) {
      toast('Enter a valid total premium.', 'error')
      return
    }

    const downPercent = parseFloat(parseNumberInput(input.down_payment_percent))
    if (!Number.isFinite(downPercent) || downPercent < 0 || downPercent > 100) {
      toast('Down payment must be between 0 and 100%.', 'error')
      return
    }

    const commissionRate = parseFloat(parseNumberInput(input.commission_rate))
    if (!Number.isFinite(commissionRate) || commissionRate < 0) {
      toast('Enter a valid commission rate.', 'error')
      return
    }

    const res = calculatePolicy({
      ...input,
      total_premium: premium,
      down_payment_percent: downPercent,
      commission_rate: commissionRate,
    })
    setResult(res)
    toast('Calculation ready.')
  }

  const handleReset = () => {
    setInput(DEFAULT_INPUT)
    setResult(null)
  }

  const downPercent =
    result && result.down_payment != null && input.total_premium
      ? Math.min(
          100,
          Math.max(
            0,
            (result.down_payment /
              parseFloat(parseNumberInput(input.total_premium))) *
              100,
          ),
        )
      : 0

  return (
    <PageShell>
      <div className="lg:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
          Tools
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Policy calculator
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Fields marked <span className="text-red-600">*</span> are required.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
          <div>
            <label className={LABEL}>
              Total premium (KSh){' '}
              <span className="normal-case text-red-600">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 36,000"
              value={input.total_premium}
              onChange={e =>
                set('total_premium', formatNumberInput(e.target.value))
              }
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>
              Down payment (%){' '}
              <span className="normal-case text-red-600">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 40"
              value={input.down_payment_percent}
              onChange={e =>
                set(
                  'down_payment_percent',
                  formatNumberInput(e.target.value),
                )
              }
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>
              Installment period{' '}
              <span className="normal-case text-red-600">*</span>
            </label>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 6, 12].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set('installment_months', m)}
                  className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${
                    input.installment_months === m
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {m}mo
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>
              First installment date{' '}
              <span className="normal-case text-red-600">*</span>
            </label>
            <input
              type="date"
              value={input.first_payment_date}
              onChange={e => set('first_payment_date', e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>
              Commission rate (%){' '}
              <span className="normal-case text-red-600">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 12.5"
              value={input.commission_rate}
              onChange={e =>
                set('commission_rate', formatNumberInput(e.target.value))
              }
              className={INPUT}
            />
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white transition hover:bg-primary-700"
          >
            Calculate
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      Premium split
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Down payment vs remaining balance
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                    {Math.round(downPercent)}% down
                  </span>
                </div>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Down payment share of premium"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(downPercent)}
                >
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${downPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-card sm:p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Down payment
                  </p>
                  <p className="mt-2 break-words text-base font-bold text-blue-800 sm:text-xl">
                    {formatKSh(result.down_payment)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card sm:p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Balance
                  </p>
                  <p className="mt-2 break-words text-base font-bold text-slate-950 sm:text-xl">
                    {formatKSh(result.remaining_balance)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-card sm:p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Monthly installment
                  </p>
                  <p className="mt-2 break-words text-base font-bold text-emerald-700 sm:text-xl">
                    {formatKSh(result.monthly_installment)}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-white p-3.5 shadow-card sm:p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Your commission
                  </p>
                  <p className="mt-2 break-words text-base font-bold text-amber-700 sm:text-xl">
                    {formatKSh(result.commission)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
                <h2 className="text-sm font-bold text-slate-900">
                  Installment schedule
                </h2>
                <div className="mt-3 space-y-0">
                  {result.installment_schedule.map((inst, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
                    >
                      <div className="text-sm text-slate-600">
                        Payment {i + 1} -{' '}
                        {format(new Date(inst.due_date), 'dd MMM yyyy')}
                      </div>
                      <div className="shrink-0 text-sm font-bold text-slate-900">
                        {formatKSh(inst.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
              >
                Reset calculator
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Enter a premium and tap Calculate to see the schedule.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
