import { useState } from 'react'
import { calculatePolicy, formatKSh } from '../utils/calculator'
import { format, addMonths } from 'date-fns'

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
    const premium = parseFloat(input.total_premium)
    if (!premium || premium <= 0) return alert('Enter a valid total premium.')
    const res = calculatePolicy({ ...input, total_premium: premium })
    setResult(res)
  }

  const handleReset = () => {
    setInput(DEFAULT_INPUT)
    setResult(null)
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-semibold text-gray-900">Policy calculator</h1>

      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total premium (KSh)</label>
          <input
            type="number"
            placeholder="e.g. 36000"
            value={input.total_premium}
            onChange={e => set('total_premium', e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Down payment — {input.down_payment_percent}%
          </label>
          <input
            type="range" min="10" max="100" step="5"
            value={input.down_payment_percent}
            onChange={e => set('down_payment_percent', Number(e.target.value))}
            className="mt-1 w-full accent-primary-700"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>10%</span><span>100%</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Installment period</label>
          <div className="mt-1 grid grid-cols-5 gap-1">
            {[1, 2, 3, 6, 12].map(m => (
              <button
                key={m}
                onClick={() => set('installment_months', m)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  input.installment_months === m
                    ? 'bg-primary-700 text-white border-primary-700'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">First installment date</label>
          <input
            type="date"
            value={input.first_payment_date}
            onChange={e => set('first_payment_date', e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Commission rate — {input.commission_rate}%
          </label>
          <input
            type="range" min="0" max="30" step="0.5"
            value={input.commission_rate}
            onChange={e => set('commission_rate', Number(e.target.value))}
            className="mt-1 w-full accent-primary-700"
          />
        </div>

        <button
          onClick={handleCalculate}
          className="w-full bg-primary-700 text-white rounded-xl py-3 font-semibold text-sm"
        >
          Calculate
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary-50 rounded-xl p-3">
              <div className="text-xs text-primary-600 font-medium">Down payment</div>
              <div className="text-lg font-bold text-primary-900">{formatKSh(result.down_payment)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 font-medium">Balance</div>
              <div className="text-lg font-bold text-gray-900">{formatKSh(result.remaining_balance)}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-xs text-green-600 font-medium">Monthly installment</div>
              <div className="text-lg font-bold text-green-800">{formatKSh(result.monthly_installment)}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <div className="text-xs text-amber-600 font-medium">Your commission</div>
              <div className="text-lg font-bold text-amber-800">{formatKSh(result.commission)}</div>
            </div>
          </div>

          {/* Installment schedule */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Installment schedule</h2>
            <div className="space-y-2">
              {result.installment_schedule.map((inst, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div className="text-sm text-gray-600">
                    Payment {i + 1} — {format(new Date(inst.due_date), 'dd MMM yyyy')}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{formatKSh(inst.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleReset} className="w-full text-gray-500 text-sm py-2">
            Reset calculator
          </button>
        </div>
      )}
    </div>
  )
}
