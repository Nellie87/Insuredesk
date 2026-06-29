import { Link } from 'react-router-dom'
import { getEventColors, eventToGoogleCalendar } from '../../utils/calendar'
import { formatKSh } from '../../utils/calculator'

const STATUS_STYLES = {
  overdue: 'bg-danger-50 text-danger-700',
  urgent: 'bg-warning-50 text-warning-700',
  soon: 'bg-amber-50 text-amber-700',
  upcoming: 'bg-blue-50 text-blue-700',
  done: 'bg-success-50 text-success-700',
}

export default function CalendarEventCard({ event, whatsAppLink, compact = false }) {
  const colors = getEventColors(event.type)
  const googleUrl = eventToGoogleCalendar(event)

  return (
    <div
      className={`rounded-xl border p-3 ${colors.bg} ${colors.border}`}
    >
      <div className="flex gap-2">
        <span className={`w-1 rounded-full shrink-0 ${colors.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wide ${colors.text}`}>
              {colors.label}
            </span>
            {!compact && (
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  STATUS_STYLES[event.status] ?? STATUS_STYLES.upcoming
                }`}
              >
                {event.status}
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-gray-900 mt-1">{event.title}</div>
          <div className="text-xs text-gray-600 mt-0.5">{event.subtitle}</div>
          {event.installment?.amount != null && (
            <div className="text-xs font-medium text-gray-800 mt-1">
              {formatKSh(event.installment.amount)}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 pl-3">
        {event.client?.id && (
          <Link
            to={`/clients/${event.client.id}`}
            className="text-xs font-medium text-primary-700 bg-white/80 px-3 py-1.5 rounded-lg border border-primary-100"
          >
            View client
          </Link>
        )}
        {event.prospect && (
          <Link
            to="/prospects"
            className="text-xs font-medium text-violet-700 bg-white/80 px-3 py-1.5 rounded-lg border border-violet-100"
          >
            View prospect
          </Link>
        )}
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-gray-700 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200"
        >
          Google Calendar
        </a>
        {whatsAppLink && (
          <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-success-700 bg-white/80 px-3 py-1.5 rounded-lg border border-success-100"
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
