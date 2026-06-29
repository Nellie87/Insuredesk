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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 text-lg leading-none"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-sm font-bold text-gray-900">
          {format(month, 'MMMM yyyy')}
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 text-lg leading-none"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide"
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
              className={`min-h-[72px] sm:min-h-[88px] p-1 border-b border-r border-gray-50 text-left transition-colors ${
                !inMonth ? 'bg-gray-50/80' : 'bg-white'
              } ${selected ? 'ring-2 ring-inset ring-primary-500 bg-primary-50/40' : 'active:bg-gray-50'}`}
            >
              <div
                className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${
                  today
                    ? 'bg-primary-800 text-white'
                    : inMonth
                      ? 'text-gray-800'
                      : 'text-gray-300'
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
                      className={`text-[8px] leading-tight truncate rounded px-0.5 py-px font-medium ${c.bg} ${c.text}`}
                    >
                      {event.title.split('·')[0].trim()}
                    </div>
                  )
                })}
                {dayEvents.length > 2 && (
                  <span className="text-[8px] text-gray-400 px-0.5">+{dayEvents.length - 2} more</span>
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
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
            {colors.label}
          </div>
        )
      })}
    </div>
  )
}
