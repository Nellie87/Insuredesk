import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'
import {
  getItemPhone,
  getOutreachMessage,
  getWhatsAppLink,
  toSmsMessage,
} from '../utils/reminders'
import { sendSms } from '../lib/sms'
import { TASK_META } from '../utils/todaysTasks'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'
import PushNotificationsCard from '../components/settings/PushNotificationsCard'

export default function TodayPage() {
  const { agent } = useAppStore()
  const { tasks, summary, loading } = useTodaysTasks()
  const [smsSendingId, setSmsSendingId] = useState(null)
  const todayLabel = format(new Date(), 'EEEE, d MMMM')

  const handleSendSms = async task => {
    const phone = getItemPhone(task)
    const message = getOutreachMessage(task, agent)
    if (!phone || !message) {
      toast('This item has no phone number or message.', 'error')
      return
    }

    setSmsSendingId(task.id)
    try {
      const result = await sendSms({ to: phone, message: toSmsMessage(message) })
      toast(
        result?.sandbox
          ? 'SMS sent. Check the Africa’s Talking simulator.'
          : `SMS sent to ${result?.to || phone}.`,
      )
    } catch (err) {
      toast(err.message || 'Could not send SMS.', 'error')
    } finally {
      setSmsSendingId(null)
    }
  }

  if (loading) return <LottieLoader label="Loading today..." />

  return (
    <PageShell narrow>
      <div>
        <h2 className="font-display text-[1.45rem] text-ink sm:text-2xl">
          {summary.headline}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {todayLabel}
          {summary.label ? ` · ${summary.label}` : ''}
        </p>
      </div>

      <PushNotificationsCard compact />

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-12 text-center shadow-card">
          <p className="text-sm font-semibold text-ink">All clear for today</p>
          <p className="mt-1 text-sm text-ink-muted">
            Overdue collections, dues, renewals, and follow-ups will show up here.
          </p>
          <Link
            to="/reminders"
            className="mt-4 inline-flex rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Open calendar
          </Link>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Needs attention</p>
            <Link
              to="/reminders"
              className="text-xs font-semibold text-primary-700"
            >
              Calendar
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {tasks.map(task => (
              <TodayTaskRow
                key={task.id}
                task={task}
                whatsAppLink={getWhatsAppLink(task, agent)}
                onSendSms={handleSendSms}
                smsBusy={smsSendingId === task.id}
              />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}

function TodayTaskRow({ task, whatsAppLink, onSendSms, smsBusy }) {
  const meta = TASK_META[task.type] ?? TASK_META.reminder
  const rail =
    task.type === 'collect' && task.daysFromToday === 0
      ? meta.railToday
      : meta.rail
  const phone = getItemPhone(task)
  const overdue = task.daysFromToday < 0

  return (
    <article className="px-4 py-3.5">
      <Link to={task.href} className="flex items-stretch gap-3">
        <span className={`w-1 shrink-0 rounded-full ${rail}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
            {meta.label}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-ink">
            {task.title}
          </span>
          {task.subtitle ? (
            <span className="mt-0.5 block truncate text-xs text-ink-muted">
              {task.subtitle}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 self-center text-right">
          {task.value ? (
            <span className="block text-sm font-semibold text-ink">{task.value}</span>
          ) : null}
          <span
            className={`block text-xs font-semibold ${
              overdue ? 'text-danger-700' : 'text-ink-muted'
            } ${task.value ? 'mt-0.5' : ''}`}
          >
            {task.when}
          </span>
        </span>
      </Link>

      {(whatsAppLink || phone) && (
        <div className="mt-2.5 flex flex-wrap gap-2 pl-4">
          {whatsAppLink ? (
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-success-50 bg-white px-3 py-1.5 text-xs font-semibold text-success-700"
            >
              WhatsApp
            </a>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Call
            </a>
          ) : null}
          {onSendSms && phone ? (
            <button
              type="button"
              onClick={() => onSendSms(task)}
              disabled={smsBusy}
              className="rounded-full border border-primary-100 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 disabled:opacity-50"
            >
              {smsBusy ? 'Sending SMS...' : 'SMS'}
            </button>
          ) : null}
        </div>
      )}
    </article>
  )
}
