import { useState } from 'react'
import { calculatePolicy, formatKSh } from '../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import { format } from 'date-fns'

const INPUT =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500'

const LABEL =
  'text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'

const DEFAULT_INPUT = {
  total_premium: '',
  down_payment_percent: 40,
  installment_months: 3,
  first_payment_date: new Date().toISOString().split('T')[0],
  commission_rate: 12.5,
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
    const res = calculatePolicy({ ...input, total_premium: premium })
    setResult(res)
    toast('Calculation ready.')
  }

  const handleReset = () => {
    setInput(DEFAULT_INPUT)
    setResult(null)
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
          Tools
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          Policy calculator
        </h1>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
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
            Down payment — {input.down_payment_percent}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={input.down_payment_percent}
            onChange={e => set('down_payment_percent', Number(e.target.value))}
            className="mt-2 w-full accent-primary-700"
          />
          <div className="mt-0.5 flex justify-between text-xs text-slate-400">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className={LABEL}>Installment period</label>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 6, 12].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => set('installment_months', m)}
                className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${
                  input.installment_months === m
                    ? 'border-primary-800 bg-primary-800 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL}>First installment date</label>
          <input
            type="date"
            value={input.first_payment_date}
            onChange={e => set('first_payment_date', e.target.value)}
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>
            Commission rate — {input.commission_rate}%
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={input.commission_rate}
            onChange={e => set('commission_rate', Number(e.target.value))}
            className="mt-2 w-full accent-primary-700"
          />
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          className="w-full rounded-xl bg-primary-800 py-3 text-sm font-bold text-white"
        >
          Calculate
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Down payment
              </p>
              <p className="mt-2 break-words text-base font-black text-blue-800">
                {formatKSh(result.down_payment)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Balance
              </p>
              <p className="mt-2 break-words text-base font-black text-slate-950">
                {formatKSh(result.remaining_balance)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Monthly installment
              </p>
              <p className="mt-2 break-words text-base font-black text-emerald-700">
                {formatKSh(result.monthly_installment)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-3.5 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Your commission
              </p>
              <p className="mt-2 break-words text-base font-black text-amber-700">
                {formatKSh(result.commission)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
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
                    Payment {i + 1} —{' '}
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
            className="w-full py-2 text-sm font-semibold text-slate-500"
          >
            Reset calculator
          </button>
        </div>
      )}
    </div>
  )
}
