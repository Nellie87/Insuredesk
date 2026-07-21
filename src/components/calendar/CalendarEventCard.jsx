import { Link } from 'react-router-dom'
import { getEventColors, eventToGoogleCalendar } from '../../utils/calendar'
import { formatKSh } from '../../utils/calculator'

const STATUS_STYLES = {
  overdue: 'border-red-200 bg-danger-50 text-danger-700',
  urgent: 'border-amber-200 bg-warning-50 text-warning-700',
  soon: 'border-amber-200 bg-amber-50 text-amber-700',
  upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export default function CalendarEventCard({
  event,
  whatsAppLink,
  compact = false,
}) {
  const colors = getEventColors(event.type)
  const googleUrl = eventToGoogleCalendar(event)

  return (
    <div className={`rounded-2xl border p-3.5 ${colors.bg} ${colors.border}`}>
      <div className="flex gap-2">
        <span className={`w-1 shrink-0 rounded-full ${colors.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide ${colors.text}`}
            >
              {colors.label}
            </span>
            {!compact && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  STATUS_STYLES[event.status] ?? STATUS_STYLES.upcoming
                }`}
              >
                {event.status}
              </span>
            )}
          </div>
          <div className="mt-1 break-words text-sm font-bold text-slate-900">
            {event.title}
          </div>
          <div className="mt-0.5 break-words text-xs text-slate-600">
            {event.subtitle}
          </div>
          {event.installment?.amount != null && (
            <div className="mt-1 text-xs font-semibold text-slate-800">
              {formatKSh(event.installment.amount)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 pl-3">
        {event.client?.id && (
          <Link
            to={`/clients/${event.client.id}`}
            className="rounded-xl border border-primary-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary-700"
          >
            View client
          </Link>
        )}
        {event.prospect && (
          <Link
            to="/prospects"
            className="rounded-xl border border-violet-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700"
          >
            View prospect
          </Link>
        )}
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          Google Calendar
        </a>
        {whatsAppLink && (
          <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-success-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-success-700"
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
