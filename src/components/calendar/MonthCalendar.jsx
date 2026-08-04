import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { EVENT_COLORS, getEventColors } from '../../utils/calendar'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthCalendar({
  month,
  onMonthChange,
  eventsByDate,
  selectedDate,
  onSelectDate,
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-lg leading-none text-slate-600"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-sm font-black tracking-tight text-slate-950">
          {format(month, 'MMMM yyyy')}
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-lg leading-none text-slate-600"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate[dateKey] ?? []
          const inMonth = isSameMonth(day, month)
          const selected = selectedDate === dateKey
          const today = isToday(day)

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`min-h-[72px] border-b border-r border-slate-50 p-1 text-left transition-colors ${
                !inMonth ? 'bg-slate-50/80' : 'bg-white'
              } ${
                selected
                  ? 'bg-primary-50/40 ring-2 ring-inset ring-primary-500'
                  : 'active:bg-slate-50'
              }`}
            >
              <div
                className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  today
                    ? 'bg-primary-800 text-white'
                    : inMonth
                      ? 'text-slate-800'
                      : 'text-slate-300'
                }`}
              >
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5 px-0.5">
                {dayEvents.slice(0, 2).map(event => {
                  const c = getEventColors(event.type)
                  return (
                    <div
                      key={event.id}
                      className={`truncate rounded px-0.5 py-px text-[8px] font-medium leading-tight ${c.bg} ${c.text}`}
                    >
                      {event.title.split('·')[0].trim()}
                    </div>
                  )
                })}
                {dayEvents.length > 2 && (
                  <span className="px-0.5 text-[8px] text-slate-400">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarLegend() {
  const types = Object.keys(EVENT_COLORS)
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {types.map(type => {
        const colors = EVENT_COLORS[type]
        return (
          <div
            key={type}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`}
            />
            {colors.label}
          </div>
        )
      })}
    </div>
  )
}
