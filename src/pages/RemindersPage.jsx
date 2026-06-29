import { useMemo, useState } from 'react'
import { format, parseISO, startOfMonth, isSameMonth } from 'date-fns'
import { useReminders } from '../hooks/useReminders'
import { useAppStore } from '../store/appStore'
import { buildReminderMessage, whatsappUrl } from '../utils/reminders'
import { downloadIcsFile, GOOGLE_CALENDAR_IMPORT_URL } from '../utils/calendar'
import MonthCalendar, { CalendarLegend } from '../components/calendar/MonthCalendar'
import CalendarEventCard from '../components/calendar/CalendarEventCard'
import LottieLoader from '../components/ui/LottieLoader'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'payment', label: 'Payments' },
  { value: 'renewal', label: 'Renewals' },
  { value: 'follow_up', label: 'Follow-ups' },
  { value: 'reminder', label: 'Scheduled' },
]

function getWhatsAppLink(event, agent) {
  const phone = event.client?.phone ?? event.prospect?.phone
  if (!phone || !agent) return null

  let message = event.reminder?.message

  if (!message && event.client && event.vehicle) {
    const trigger =
      event.type === 'renewal'
        ? 'policy_expiry_30d'
        : event.status === 'overdue'
          ? 'payment_overdue_1d'
          : 'payment_due_3d'

    message = buildReminderMessage({
      trigger,
      client: event.client,
      vehicle: event.vehicle,
      installment: event.installment,
      agent,
    })
  }

  if (!message && event.prospect) {
    message = `Hello ${event.prospect.full_name.split(' ')[0]}, this is ${agent.name}. Following up on your insurance enquiry. Please call or WhatsApp me on ${agent.phone}.`
  }

  if (!message) return null
  return whatsappUrl(phone, message)
}

export default function RemindersPage() {
  const { agent } = useAppStore()
  const { groupedByDate, calendarEvents, loading } = useReminders()

  const [view, setView] = useState('month')
  const [filter, setFilter] = useState('all')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return calendarEvents
    return calendarEvents.filter(e => e.type === filter)
  }, [calendarEvents, filter])

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const event of filteredEvents) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }
    return map
  }, [filteredEvents])

  const filteredGroups = useMemo(() => {
    const groups = {}
    for (const event of filteredEvents) {
      if (!groups[event.date]) groups[event.date] = []
      groups[event.date].push(event)
    }
    return Object.entries(groups).map(([date, items]) => ({
      date,
      label: format(parseISO(date), 'EEE, d MMM yyyy'),
      items,
    }))
  }, [filteredEvents])

  const selectedDayEvents = eventsByDate[selectedDate] ?? []

  const handleSelectDate = dateKey => {
    setSelectedDate(dateKey)
    const d = parseISO(dateKey)
    if (!isSameMonth(d, month)) {
      setMonth(startOfMonth(d))
    }
  }

  const handleToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setMonth(startOfMonth(new Date()))
    setSelectedDate(today)
  }

  if (loading) {
    return <LottieLoader label="Loading calendar..." />
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">
            Payments, renewals, and follow-ups at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToday}
          className="text-xs font-semibold text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg shrink-0"
        >
          Today
        </button>
      </div>

      <CalendarLegend />

      <div className="flex gap-2">
        {['month', 'agenda'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
              view === v
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {v === 'month' ? 'Month' : 'Agenda'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium border ${
              filter === f.value
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
        <div className="text-xs font-semibold text-gray-700">Google Calendar</div>
        <p className="text-xs text-gray-500">
          Export all events as a file and import into Google Calendar, or add individual events with the button on each item.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadIcsFile(filteredEvents)}
            className="text-xs font-medium text-primary-800 bg-primary-50 px-3 py-2 rounded-lg"
          >
            Download .ics file
          </button>
          <a
            href={GOOGLE_CALENDAR_IMPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200"
          >
            Open Google import
          </a>
        </div>
      </div>

      {view === 'month' ? (
        <>
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            eventsByDate={eventsByDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

          <section className="space-y-2">
            <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}
            </h2>
            {selectedDayEvents.length === 0 ? (
              <div className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-4 text-center">
                No events on this day.
              </div>
            ) : (
              selectedDayEvents.map(event => (
                <CalendarEventCard
                  key={event.id}
                  event={event}
                  whatsAppLink={getWhatsAppLink(event, agent)}
                />
              ))
            )}
          </section>
        </>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-gray-200">
          Nothing scheduled for this filter.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map(group => (
            <section key={group.date}>
              <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map(event => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    whatsAppLink={getWhatsAppLink(event, agent)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
