import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { useVehiclePolicyForm } from '../hooks/useVehiclePolicyForm'
import ClientSearchSelect from '../components/ui/ClientSearchSelect'
import {
  CoverStep,
  DatesStep,
  PaymentStep,
  ReviewStep,
  VehicleStep,
} from '../components/modules/VehiclePolicySteps'
import LottieLoader from '../components/ui/LottieLoader'
import { toast } from '../store/toastStore'
import { BTN_PRIMARY, BTN_SECONDARY } from '../constants/formStyles'

const STEPS = [
  { id: 'client', title: 'Client', caption: 'Choose who owns this vehicle. You can search by name, phone, or an existing plate.' },
  { id: 'vehicle', title: 'Vehicle', caption: 'Identify the vehicle with registration or chassis, then add make, model, and use.' },
  { id: 'cover', title: 'Cover', caption: 'Set this vehicle’s insurance package: insurer, cover type, and total premium.' },
  { id: 'dates', title: 'Dates', caption: 'Confirm the policy start and expiry dates for this cover period.' },
  { id: 'payment', title: 'Payment', caption: 'Choose installments, set % split (e.g. 40 / 30 / 30), and adjust due dates if needed.' },
  { id: 'review', title: 'Review', caption: 'Confirm the details below, then save this vehicle against the client.' },
]

function StepHeader({ step, lockedClient }) {
  const meta = STEPS[step]
  return (
    <div className="mx-auto w-full max-w-4xl text-left sm:text-center">
      <h2 className="font-display text-xl text-ink sm:text-2xl">{meta.title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted sm:mx-auto">
        {lockedClient && step === 0
          ? `Adding a vehicle for ${lockedClient.name}. Each vehicle can have its own insurance package.`
          : meta.caption}
      </p>
    </div>
  )
}

function StepProgress({ current, items }) {
  return (
    <ol className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 hide-scrollbar">
      {items.map((item, index) => {
        const active = index === current
        const done = index < current
        return (
          <li key={item.id} className="min-w-0 flex-1">
            <div
              className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                active ? 'bg-step-active text-white shadow-soft' : ''
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  active
                    ? 'bg-white/20 text-white'
                    : done
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-slate-200/80 text-slate-500'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className={`truncate text-xs font-semibold sm:text-[13px] ${
                  active ? 'text-white' : done ? 'text-primary-700' : 'text-slate-400'
                }`}
              >
                {item.title}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function AddVehiclePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetClientId = searchParams.get('clientId') || ''
  const { clients, loading, addVehicleToClient } = useClients()
  const policyForm = useVehiclePolicyForm()

  const lockedClient = useMemo(
    () => clients.find(client => client.id === presetClientId) || null,
    [clients, presetClientId],
  )

  const skipClientStep = Boolean(presetClientId && lockedClient)
  const wizardSteps = skipClientStep ? STEPS.slice(1) : STEPS

  const [clientId, setClientId] = useState(presetClientId)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savingMode, setSavingMode] = useState(null)

  const selectedClient =
    clients.find(client => client.id === (skipClientStep ? presetClientId : clientId)) ||
    lockedClient

  const backTo = skipClientStep ? `/clients/${presetClientId}` : '/vehicles'

  const validate = () => {
    if (!skipClientStep && step === 0) {
      if (!clientId) return 'Select a client for this vehicle.'
      return null
    }
    const policyStepIndex = skipClientStep ? step : step - 1
    return policyForm.validateVehicleStep(Math.max(policyStepIndex, 0))
  }

  const goNext = () => {
    const message = validate()
    if (message) {
      setError(message)
      toast(message, 'error')
      return
    }
    setError(null)
    setStep(prev => Math.min(prev + 1, wizardSteps.length - 1))
  }

  const goBack = () => {
    setError(null)
    setStep(prev => Math.max(prev - 1, 0))
  }

  const handleSubmit = async keepGoing => {
    const allErrors = skipClientStep
      ? [0, 1, 2, 3].map(index => policyForm.validateVehicleStep(index)).find(Boolean)
      : !clientId
        ? 'Select a client for this vehicle.'
        : [0, 1, 2, 3].map(index => policyForm.validateVehicleStep(index)).find(Boolean)

    if (allErrors) {
      setError(allErrors)
      toast(allErrors, 'error')
      return
    }

    const ownerId = skipClientStep ? presetClientId : clientId
    const { vehicle, schedule } = policyForm.buildPayload()

    setSaving(true)
    setSavingMode(keepGoing ? 'another' : 'done')
    setError(null)
    try {
      const saved = await addVehicleToClient(ownerId, { vehicle, schedule })
      toast(
        `${saved.registration || 'Vehicle'} saved${
          selectedClient ? ` for ${selectedClient.name}` : ''
        }.`,
      )
      if (keepGoing) {
        policyForm.resetForm()
        setStep(skipClientStep ? 0 : 1)
        return
      }
      navigate(`/clients/${ownerId}`, { replace: true })
    } catch (err) {
      const failMessage = err.message || 'Could not save vehicle. Try again.'
      setError(failMessage)
      toast(failMessage, 'error')
    } finally {
      setSaving(false)
      setSavingMode(null)
    }
  }

  if (loading && !clients.length) {
    return <LottieLoader label="Loading clients..." />
  }

  const showClientStep = !skipClientStep && step === 0
  const currentPolicyStep = wizardSteps[step]?.id

  return (
    <div className="flex min-h-full flex-col bg-white lg:min-h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to={backTo}
          className="hidden items-center text-sm font-semibold text-primary-600 transition hover:text-primary-700 lg:inline-flex"
        >
          ← {skipClientStep ? 'Back to client' : 'Back to vehicles'}
        </Link>
        <p className="ml-auto text-sm font-medium text-slate-400">
          Step {step + 1} of {wizardSteps.length}
        </p>
      </div>

      <div className="border-b border-slate-100 px-4 py-3 sm:px-6 lg:px-8">
        <StepProgress current={step} items={wizardSteps} />
      </div>

      <div className="flex flex-1 flex-col space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <StepHeader step={skipClientStep ? step + 1 : step} lockedClient={lockedClient} />

        {selectedClient && (
          <div className="mx-auto w-full max-w-4xl rounded-xl border border-primary-100 bg-primary-50/70 px-3.5 py-3 text-sm text-primary-800">
            Linking this vehicle to <span className="font-semibold">{selectedClient.name}</span>
            {(selectedClient.vehicles?.length ?? 0) > 0
              ? ` · ${selectedClient.vehicles.length} already on file`
              : ' · first vehicle'}
            . Cover type is set per vehicle.
          </div>
        )}

        {error && (
          <div className="mx-auto w-full max-w-4xl rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mx-auto w-full max-w-4xl flex-1">
          {showClientStep && (
            <div className="space-y-3">
              <ClientSearchSelect
                clients={clients}
                value={clientId}
                onChange={id => {
                  setClientId(id)
                  setError(null)
                }}
              />
              <p className="text-sm text-slate-500">
                Need a new person first?{' '}
                <Link to="/clients/add" className="font-semibold text-primary-600">
                  Add a client
                </Link>
                , then come back to attach a vehicle.
              </p>
            </div>
          )}

          {currentPolicyStep === 'vehicle' && (
            <VehicleStep
              form={policyForm.form}
              set={policyForm.set}
              setVehicleValue={policyForm.setVehicleValue}
              modelOptions={policyForm.modelOptions}
            />
          )}

          {currentPolicyStep === 'cover' && (
            <CoverStep
              form={policyForm.form}
              set={policyForm.set}
              setPremiumRate={policyForm.setPremiumRate}
              setPremiumAmount={policyForm.setPremiumAmount}
            />
          )}

          {currentPolicyStep === 'dates' && (
            <DatesStep
              form={policyForm.form}
              set={policyForm.set}
              datesTouched={policyForm.datesTouched}
              setDatesTouched={policyForm.setDatesTouched}
            />
          )}

          {currentPolicyStep === 'payment' && (
            <PaymentStep
              form={policyForm.form}
              set={policyForm.set}
              premiumNumber={policyForm.premiumNumber}
              draftSchedule={policyForm.draftSchedule}
              installmentOptions={policyForm.installmentOptions}
              installmentPresets={policyForm.installmentPresets}
              applyRatePreset={policyForm.applyRatePreset}
              updateInstallment={policyForm.updateInstallment}
              rateTotal={policyForm.rateTotal}
              amountTotal={policyForm.amountTotal}
              ratesBalanced={policyForm.ratesBalanced}
              amountsBalanced={policyForm.amountsBalanced}
            />
          )}

          {currentPolicyStep === 'review' && (
            <ReviewStep
              form={policyForm.form}
              client={selectedClient}
              resolvedMake={policyForm.resolvedMake}
              resolvedModel={policyForm.resolvedModel}
              resolvedInsurer={policyForm.resolvedInsurer}
              premiumNumber={policyForm.premiumNumber}
              policyTypeLabel={policyForm.policyTypeLabel}
            />
          )}
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || saving}
            className={BTN_SECONDARY}
          >
            Back
          </button>

          {step < wizardSteps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={saving}
              className={`${BTN_PRIMARY} sm:min-w-[9rem]`}
            >
              Continue
            </button>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className={BTN_SECONDARY}
              >
                {saving && savingMode === 'another' ? 'Saving…' : 'Save and add another'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className={`${BTN_PRIMARY} sm:min-w-[9rem]`}
              >
                {saving && savingMode === 'done' ? 'Saving…' : 'Confirm & save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
