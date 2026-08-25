import DateInput from '../ui/DateInput'
import Select from '../ui/Select'
import { INSURER_OPTIONS } from '../../constants/insurers'
import { CAR_MAKE_OPTIONS } from '../../constants/carMakes'
import { POLICY_TYPES, USE_TYPES } from '../../constants/policies'
import {
  INPUT,
  REQUIRED_MARK,
} from '../../constants/formStyles'
import { formatKSh } from '../../utils/calculator'
import { formatEngineCapacity, formatNumberInput, parseNumberInput } from '../../utils/numberInput'
import { formatDisplayDate } from '../../utils/policyDates'

export function Field({ label, required, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-slate-600">
        {label}
        {required && <span className={REQUIRED_MARK}>*</span>}
      </label>
      {hint && <p className="mt-0.5 text-sm text-slate-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function ReviewFact({ label, value, className = '' }) {
  if (value == null || value === '') return null
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  )
}

function ReviewSection({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 ${className}`}
    >
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h3>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

export function VehicleStep({ form, set, setVehicleValue, modelOptions }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
      <Field label="Registration number" hint="Optional if chassis is provided">
        <input
          autoFocus
          placeholder="e.g. KDA 123A"
          value={form.registration}
          onChange={e => set('registration', e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Chassis number" hint="Optional if registration is provided">
        <input
          placeholder="Chassis / VIN"
          value={form.chassis}
          onChange={e => set('chassis', e.target.value)}
          className={INPUT}
        />
      </Field>
      <p className="sm:col-span-2 text-sm text-slate-500">
        At least one of registration or chassis is required
        <span className={REQUIRED_MARK}>*</span>
      </p>

      <Field label="Make of car">
        <Select value={form.make} onChange={e => set('make', e.target.value)}>
          {CAR_MAKE_OPTIONS.map(option => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Model">
        <Select
          value={form.model}
          onChange={e => set('model', e.target.value)}
          disabled={!form.make || form.make === 'Other'}
        >
          {modelOptions.map(option => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      {form.make === 'Other' && (
        <>
          <Field label="Other make">
            <input
              placeholder="Enter make"
              value={form.make_other}
              onChange={e => set('make_other', e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Model">
            <input
              placeholder="Enter model"
              value={form.model_other}
              onChange={e => set('model_other', e.target.value)}
              className={INPUT}
            />
          </Field>
        </>
      )}

      {form.make !== 'Other' && form.model === 'Other' && (
        <Field label="Other model" className="sm:col-span-2">
          <input
            placeholder="Enter model"
            value={form.model_other}
            onChange={e => set('model_other', e.target.value)}
            className={INPUT}
          />
        </Field>
      )}

      <Field label="Year">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Year"
          value={form.year}
          onChange={e => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
          className={INPUT}
        />
      </Field>
      <Field label="Engine (cc)">
        <input
          type="text"
          inputMode="numeric"
          placeholder="1500"
          value={form.engine_capacity}
          onChange={e =>
            set('engine_capacity', e.target.value.replace(/\D/g, '').slice(0, 5))
          }
          className={INPUT}
        />
      </Field>
      <Field label="Vehicle value">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={form.vehicle_value}
          onChange={e => setVehicleValue(e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Use type">
        <Select value={form.use_type} onChange={e => set('use_type', e.target.value)}>
          {USE_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Vehicle notes" className="sm:col-span-2">
        <textarea
          rows={3}
          placeholder="Vehicle condition, plate history, garage notes…"
          value={form.vehicle_notes}
          onChange={e => set('vehicle_notes', e.target.value)}
          className={INPUT}
        />
      </Field>
    </div>
  )
}

export function CoverStep({ form, set, setPremiumRate, setPremiumAmount }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
      <Field label="Cover type / insurance package" className="sm:col-span-2">
        <Select
          value={form.policy_type}
          onChange={e => set('policy_type', e.target.value)}
        >
          {POLICY_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Insurer">
        <Select value={form.insurer} onChange={e => set('insurer', e.target.value)}>
          {INSURER_OPTIONS.map(option => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Policy number">
        <input
          placeholder="Policy no."
          value={form.policy_number}
          onChange={e => set('policy_number', e.target.value)}
          className={INPUT}
        />
      </Field>
      {form.insurer === 'Other' && (
        <Field label="Other insurer name" className="sm:col-span-2">
          <input
            placeholder="Enter insurer name"
            value={form.insurer_other}
            onChange={e => set('insurer_other', e.target.value)}
            className={INPUT}
          />
        </Field>
      )}
      <Field label="Sum insured" hint="Taken from vehicle value">
        <input
          type="text"
          readOnly
          value={form.vehicle_value || '-'}
          className={`${INPUT} bg-slate-50 text-slate-600`}
          tabIndex={-1}
        />
      </Field>
      <Field
        label="Premium rate"
        hint="Optional. Enter % of sum insured to calculate total premium."
      >
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 4.5"
            value={form.premium_rate}
            onChange={e => setPremiumRate(e.target.value)}
            className={`${INPUT} pr-10`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-slate-400">
            %
          </span>
        </div>
      </Field>
      <Field
        label="Total premium"
        required
        hint={
          form.premium_rate
            ? 'Calculated from sum insured × rate. Edit to override.'
            : undefined
        }
        className="sm:col-span-2"
      >
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={form.premium}
          onChange={e => setPremiumAmount(e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Cover / policy notes" className="sm:col-span-2">
        <textarea
          rows={3}
          placeholder="Endorsements, special terms, insurer notes…"
          value={form.cover_notes}
          onChange={e => set('cover_notes', e.target.value)}
          className={INPUT}
        />
      </Field>
    </div>
  )
}

export function DatesStep({ form, set, datesTouched, setDatesTouched }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
      <Field
        label="Policy start date"
        required
        hint="Installment due dates are generated from this date"
      >
        <DateInput
          value={form.start_date}
          onChange={value => set('start_date', value)}
        />
      </Field>
      <Field
        label="Annual renewal / expiry"
        required
        hint="Defaults to one day before the start anniversary (e.g. start 8th → renew 7th)"
      >
        <DateInput
          value={form.expiry_date}
          onChange={value => {
            setDatesTouched(true)
            set('expiry_date', value)
          }}
        />
      </Field>
      {!datesTouched && (
        <p className="sm:col-span-2 text-sm text-slate-500">
          Expiry defaults to one day before the start anniversary (e.g. start 8th →
          renew 7th) and stays editable.
        </p>
      )}
    </div>
  )
}

export function PaymentStep({
  form,
  set,
  premiumNumber,
  draftSchedule,
  installmentOptions,
  installmentPresets,
  applyRatePreset,
  updateInstallment,
  rateTotal,
  amountTotal,
  ratesBalanced,
  amountsBalanced,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Total premium
          </p>
          <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
            {formatKSh(premiumNumber)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Installments
          </p>
          <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
            {form.installment_count}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            First installment
          </p>
          <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
            {formatKSh(
              Number(parseNumberInput(form.installment_overrides[0]?.amount)) ||
                draftSchedule?.installments?.[0]?.amount ||
                0,
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            First due
          </p>
          <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
            {formatDisplayDate(form.start_date) || '-'}
          </p>
        </div>
      </div>

      <Field label="Number of installments" required>
        <div className="flex flex-wrap gap-2">
          {installmentOptions.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => set('installment_count', count)}
              className={`min-w-[3rem] rounded-xl border px-4 py-2.5 text-base font-bold transition ${
                form.installment_count === count
                  ? 'border-primary-300 bg-primary-50 text-primary-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary-200'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-base text-slate-700">
        <input
          type="checkbox"
          checked={form.allow_five_installments}
          onChange={e => set('allow_five_installments', e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-500"
        />
        Allow up to 5 installments
      </label>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Installment schedule</h3>
          <p className="mt-1 text-sm text-slate-500">
            Set each installment as a % of total premium (e.g. 40 / 30 / 30). Due
            dates follow the plan and stay editable.
          </p>
        </div>

        {installmentPresets.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {installmentPresets.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyRatePreset(preset.id)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {(draftSchedule?.installments ?? []).map((installment, index) => {
          const override = form.installment_overrides[index] ?? {
            amount: formatNumberInput(String(installment.amount)),
            rate: formatNumberInput(String(installment.rate)),
            due_date: installment.due_date,
          }

          return (
            <div
              key={installment.number}
              className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-[auto_minmax(5.5rem,0.7fr)_1fr_1fr]"
            >
              <div className="flex items-center">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                  #{installment.number}
                </span>
              </div>
              <Field label="Rate">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={override.rate ?? ''}
                    onChange={e => updateInstallment(index, 'rate', e.target.value)}
                    className={`${INPUT} pr-10`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-slate-400">
                    %
                  </span>
                </div>
              </Field>
              <Field label="Amount">
                <input
                  type="text"
                  inputMode="decimal"
                  value={override.amount}
                  onChange={e => updateInstallment(index, 'amount', e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Due date">
                <DateInput
                  value={override.due_date}
                  onChange={value => updateInstallment(index, 'due_date', value)}
                />
              </Field>
            </div>
          )
        })}

        {form.installment_overrides.length > 0 && (
          <p
            className={`text-sm font-medium ${
              ratesBalanced && amountsBalanced ? 'text-slate-500' : 'text-amber-700'
            }`}
          >
            Rates total {rateTotal.toFixed(2)}%
            {!ratesBalanced ? ' (should be 100%)' : ''}
            {' · '}
            Amounts {formatKSh(amountTotal)}
            {!amountsBalanced ? ` (should be ${formatKSh(premiumNumber)})` : ''}
          </p>
        )}
      </div>

      <Field label="Payment notes">
        <textarea
          rows={3}
          placeholder="Agreed payment terms, M-Pesa instructions…"
          value={form.payment_notes}
          onChange={e => set('payment_notes', e.target.value)}
          className={INPUT}
        />
      </Field>
    </div>
  )
}

export function ReviewStep({
  form,
  client,
  resolvedMake,
  resolvedModel,
  resolvedInsurer,
  premiumNumber,
  policyTypeLabel,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary-900 px-5 py-5 text-white sm:px-6">
        <p className="text-2xs font-medium uppercase tracking-[0.1em] text-white/50">
          Ready to save
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-semibold">
              {client?.name || 'Vehicle'}
            </h3>
            <p className="mt-1 text-base text-white/70">
              {form.registration.trim().toUpperCase() || 'Pending reg'}
              {' · '}
              {[form.year, resolvedMake, resolvedModel].filter(Boolean).join(' ')}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
              Total premium
            </p>
            <p className="mt-1 font-sans text-xl font-semibold tracking-tight">
              {formatKSh(premiumNumber)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {client && (
          <ReviewSection title="Insured">
            <ReviewFact label="Name" value={client.name} />
            <ReviewFact label="Phone" value={client.phone} />
            <ReviewFact label="ID number" value={client.id_number} />
            <ReviewFact
              label="Existing vehicles"
              value={
                (client.vehicles?.length ?? 0) > 0
                  ? `${client.vehicles.length} already on file`
                  : 'First vehicle'
              }
            />
          </ReviewSection>
        )}

        <ReviewSection title="Vehicle">
          <ReviewFact
            label="Registration"
            value={form.registration.trim().toUpperCase() || 'Pending'}
          />
          <ReviewFact label="Chassis" value={form.chassis.trim().toUpperCase()} />
          <ReviewFact
            label="Make / model"
            value={`${resolvedMake} ${resolvedModel}`}
          />
          <ReviewFact label="Year" value={form.year} />
          <ReviewFact
            label="Engine"
            value={formatEngineCapacity(form.engine_capacity)}
          />
          <ReviewFact
            label="Vehicle value"
            value={
              form.vehicle_value
                ? formatKSh(Number(parseNumberInput(form.vehicle_value)) || 0)
                : null
            }
          />
        </ReviewSection>

        <ReviewSection title="Insurance package" className={!client ? 'lg:col-span-2' : ''}>
          <ReviewFact label="Cover type" value={policyTypeLabel} />
          <ReviewFact label="Insurer" value={resolvedInsurer} />
          <ReviewFact label="Policy number" value={form.policy_number} />
          <ReviewFact
            label="Start"
            value={formatDisplayDate(form.start_date)}
          />
          <ReviewFact
            label="Expiry"
            value={formatDisplayDate(form.expiry_date)}
          />
          <ReviewFact label="Premium" value={formatKSh(premiumNumber)} />
        </ReviewSection>
      </div>
    </div>
  )
}
