import { useEffect, useMemo, useState } from 'react'
import {
  amountsFromRates,
  buildInstallmentSchedule,
  presetInstallmentRates,
  rateFromAmount,
} from '../utils/calculator'
import {
  formatNumberInput,
  parseEngineCapacity,
  parseNumberInput,
  premiumFromRate,
} from '../utils/numberInput'
import { defaultExpiryDate } from '../utils/policyDates'
import { getCarModelOptions } from '../constants/carMakes'
import { POLICY_TYPES } from '../constants/policies'

export const DEFAULT_INSTALLMENT_OPTIONS = [1, 2, 3]
export const EXTENDED_INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5]

const today = new Date().toISOString().slice(0, 10)

export const INITIAL_VEHICLE_FORM = {
  registration: '',
  chassis: '',
  make: '',
  make_other: '',
  model: '',
  model_other: '',
  year: '',
  engine_capacity: '',
  vehicle_value: '',
  use_type: 'private',
  vehicle_notes: '',
  insurer: '',
  insurer_other: '',
  policy_number: '',
  policy_type: 'comprehensive',
  premium_rate: '',
  premium: '',
  cover_notes: '',
  start_date: today,
  expiry_date: defaultExpiryDate(today),
  installment_count: 3,
  allow_five_installments: false,
  payment_notes: '',
  installment_overrides: [],
}

export function useVehiclePolicyForm() {
  const [form, setForm] = useState(INITIAL_VEHICLE_FORM)
  const [datesTouched, setDatesTouched] = useState(false)

  const set = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'start_date' && value) {
        next.expiry_date = defaultExpiryDate(value)
      }
      if (key === 'make') {
        next.model = ''
        next.model_other = ''
        if (value !== 'Other') next.make_other = ''
      }
      if (key === 'installment_count' || key === 'premium' || key === 'start_date') {
        next.installment_overrides = []
      }
      if (key === 'allow_five_installments' && !value && next.installment_count > 3) {
        next.installment_count = 3
        next.installment_overrides = []
      }
      return next
    })

    if (key === 'start_date') setDatesTouched(false)
  }

  const setVehicleValue = value => {
    const formatted = formatNumberInput(value)
    setForm(prev => {
      const next = { ...prev, vehicle_value: formatted }
      const calculated = premiumFromRate(formatted, prev.premium_rate)
      if (calculated != null) {
        next.premium = calculated
        next.installment_overrides = []
      }
      return next
    })
  }

  const setPremiumRate = value => {
    const formatted = formatNumberInput(value)
    setForm(prev => {
      const next = { ...prev, premium_rate: formatted }
      const calculated = premiumFromRate(prev.vehicle_value, formatted)
      if (calculated != null) {
        next.premium = calculated
        next.installment_overrides = []
      }
      return next
    })
  }

  const setPremiumAmount = value => {
    setForm(prev => ({
      ...prev,
      premium: formatNumberInput(value),
      premium_rate: '',
      installment_overrides: [],
    }))
  }

  const modelOptions = getCarModelOptions(form.make)
  const installmentOptions = form.allow_five_installments
    ? EXTENDED_INSTALLMENT_OPTIONS
    : DEFAULT_INSTALLMENT_OPTIONS

  const resolvedMake =
    form.make === 'Other'
      ? form.make_other.trim() || 'Other'
      : form.make.trim() || 'Unknown'
  const resolvedModel =
    form.make === 'Other' || form.model === 'Other'
      ? form.model_other.trim() || 'Other'
      : form.model.trim() || 'Unknown'
  const resolvedInsurer =
    form.insurer === 'Other'
      ? form.insurer_other.trim() || 'Other'
      : form.insurer.trim() || 'Unknown'

  const premiumNumber = Number(parseNumberInput(form.premium)) || 0

  const draftSchedule = useMemo(
    () =>
      buildInstallmentSchedule({
        premium: premiumNumber,
        installmentCount: form.installment_count,
        startDate: form.start_date,
        overrides: form.installment_overrides,
        maxInstallments: form.allow_five_installments ? 5 : 3,
      }),
    [
      premiumNumber,
      form.installment_count,
      form.start_date,
      form.installment_overrides,
      form.allow_five_installments,
    ],
  )

  useEffect(() => {
    if (!draftSchedule?.installments?.length) return
    if (form.installment_overrides.length === draftSchedule.installments.length) return

    setForm(prev => ({
      ...prev,
      installment_overrides: draftSchedule.installments.map(item => ({
        amount: formatNumberInput(String(item.amount)),
        rate: formatNumberInput(String(item.rate)),
        due_date: item.due_date,
      })),
    }))
  }, [draftSchedule, form.installment_overrides.length])

  const getInstallmentRows = (prev = form) => {
    if (prev.installment_overrides.length > 0) return prev.installment_overrides
    return (draftSchedule?.installments ?? []).map(item => ({
      amount: formatNumberInput(String(item.amount)),
      rate: formatNumberInput(String(item.rate)),
      due_date: item.due_date,
    }))
  }

  const applyInstallmentRates = (rates, dueDates) => {
    const amounts = amountsFromRates(premiumNumber, rates)
    return rates.map((rate, index) => ({
      rate: formatNumberInput(String(rate)),
      amount: formatNumberInput(String(amounts[index] ?? 0)),
      due_date:
        dueDates?.[index] ||
        draftSchedule?.installments?.[index]?.due_date ||
        form.start_date,
    }))
  }

  const applyRatePreset = preset => {
    const rates = presetInstallmentRates(form.installment_count, preset)
    setForm(prev => ({
      ...prev,
      installment_overrides: applyInstallmentRates(
        rates,
        getInstallmentRows(prev).map(item => item.due_date),
      ),
    }))
  }

  const updateInstallment = (index, key, value) => {
    setForm(prev => {
      const base = getInstallmentRows(prev)

      if (key === 'due_date') {
        return {
          ...prev,
          installment_overrides: base.map((item, i) =>
            i === index ? { ...item, due_date: value } : item,
          ),
        }
      }

      if (key === 'rate') {
        const rate = formatNumberInput(value)
        const rates = base.map((row, i) =>
          i === index
            ? Number(parseNumberInput(rate)) || 0
            : Number(parseNumberInput(row.rate)) || 0,
        )
        const amounts = amountsFromRates(premiumNumber, rates)

        return {
          ...prev,
          installment_overrides: base.map((item, i) => ({
            ...item,
            rate: i === index ? rate : item.rate,
            amount: formatNumberInput(String(amounts[i] ?? 0)),
          })),
        }
      }

      const amount = formatNumberInput(value)
      return {
        ...prev,
        installment_overrides: base.map((item, i) =>
          i === index
            ? {
                ...item,
                amount,
                rate: formatNumberInput(
                  String(
                    rateFromAmount(premiumNumber, parseNumberInput(amount) || 0),
                  ),
                ),
              }
            : item,
        ),
      }
    })
  }

  const rateTotal = form.installment_overrides.reduce(
    (sum, item) => sum + (Number(parseNumberInput(item.rate)) || 0),
    0,
  )
  const amountTotal = form.installment_overrides.reduce(
    (sum, item) => sum + (Number(parseNumberInput(item.amount)) || 0),
    0,
  )
  const ratesBalanced = Math.abs(rateTotal - 100) < 0.05
  const amountsBalanced =
    premiumNumber > 0 && Math.abs(amountTotal - premiumNumber) < 0.5

  const installmentPresets =
    form.installment_count === 2
      ? [
          { id: 'equal', label: 'Equal' },
          { id: '60-40', label: '60 / 40' },
          { id: '70-30', label: '70 / 30' },
        ]
      : form.installment_count === 3
        ? [
            { id: 'equal', label: 'Equal' },
            { id: '40-30-30', label: '40 / 30 / 30' },
            { id: '50-30-20', label: '50 / 30 / 20' },
          ]
        : form.installment_count === 4
          ? [
              { id: 'equal', label: 'Equal' },
              { id: '40-20-20-20', label: '40 / 20 / 20 / 20' },
            ]
          : [{ id: 'equal', label: 'Equal' }]

  const policyTypeLabel =
    POLICY_TYPES.find(type => type.value === form.policy_type)?.label ??
    form.policy_type

  const validateVehicleStep = currentStep => {
    if (currentStep === 0) {
      if (!form.registration.trim() && !form.chassis.trim()) {
        return 'Provide a vehicle registration number or chassis number.'
      }
    }
    if (currentStep === 1) {
      if (!premiumNumber) return 'Total premium is required.'
    }
    if (currentStep === 2) {
      if (!form.start_date || !form.expiry_date) {
        return 'Policy start and expiry dates are required.'
      }
    }
    if (currentStep === 3) {
      if (!draftSchedule?.installments?.length) {
        return 'Could not build an installment schedule. Check premium and start date.'
      }
      if (form.installment_overrides.length > 0 && !ratesBalanced) {
        return 'Installment rates must add up to 100%.'
      }
      if (form.installment_overrides.length > 0 && !amountsBalanced) {
        return 'Installment amounts must add up to the total premium.'
      }
    }
    return null
  }

  const buildPayload = () => {
    const registration =
      form.registration.trim().toUpperCase() ||
      `PENDING-${Date.now().toString().slice(-6)}`

    const schedule = buildInstallmentSchedule({
      premium: premiumNumber,
      installmentCount: form.installment_count,
      startDate: form.start_date,
      overrides: form.installment_overrides.map(item => ({
        amount: parseNumberInput(item.amount),
        due_date: item.due_date,
      })),
      maxInstallments: form.allow_five_installments ? 5 : 3,
    })

    return {
      vehicle: {
        registration,
        chassis: form.chassis.trim().toUpperCase() || null,
        make: resolvedMake,
        model: resolvedModel,
        year: form.year,
        engine_capacity: parseEngineCapacity(form.engine_capacity),
        vehicle_value: parseNumberInput(form.vehicle_value),
        use_type: form.use_type,
        insurer: resolvedInsurer,
        policy_number: form.policy_number,
        policy_type: form.policy_type,
        start_date: form.start_date,
        expiry_date: form.expiry_date,
        cover_months: 12,
        sum_insured: parseNumberInput(form.vehicle_value),
        premium: parseNumberInput(form.premium),
        vehicle_notes: form.vehicle_notes,
        cover_notes: form.cover_notes,
        payment_notes: form.payment_notes,
      },
      schedule,
    }
  }

  const resetForm = () => {
    setForm({
      ...INITIAL_VEHICLE_FORM,
      start_date: today,
      expiry_date: defaultExpiryDate(today),
    })
    setDatesTouched(false)
  }

  return {
    form,
    set,
    setVehicleValue,
    setPremiumRate,
    setPremiumAmount,
    datesTouched,
    setDatesTouched,
    modelOptions,
    installmentOptions,
    installmentPresets,
    resolvedMake,
    resolvedModel,
    resolvedInsurer,
    premiumNumber,
    draftSchedule,
    applyRatePreset,
    updateInstallment,
    rateTotal,
    amountTotal,
    ratesBalanced,
    amountsBalanced,
    policyTypeLabel,
    validateVehicleStep,
    buildPayload,
    resetForm,
  }
}
