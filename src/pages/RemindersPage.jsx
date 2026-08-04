import { useMemo, useState } from 'react'
import { format, parseISO, startOfMonth, isSameMonth } from 'date-fns'
import { useReminders } from '../hooks/useReminders'
import { useAppStore } from '../store/appStore'
import { buildReminderMessage, whatsappUrl } from '../utils/reminders'
import {
  downloadIcsFile,
  GOOGLE_CALENDAR_IMPORT_URL,
} from '../utils/calendar'
import MonthCalendar, {
  CalendarLegend,
} from '../components/calendar/MonthCalendar'
import CalendarEventCard from '../components/calendar/CalendarEventCard'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'

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
  const { calendarEvents, loading } = useReminders()

  const [view, setView] = useState('month')
  const [filter, setFilter] = useState('all')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  )

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
    <PageShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 lg:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
            Schedule
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Payments, renewals, and follow-ups at a glance.
          </p>
        </div>
        <p className="hidden text-sm text-slate-500 lg:block">
          Payments, renewals, and follow-ups at a glance.
        </p>
        <button
          type="button"
          onClick={handleToday}
          className="ml-auto shrink-0 rounded-xl border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-primary-100"
        >
          Today
        </button>
      </div>

      <CalendarLegend />

      <div className="flex gap-2 sm:max-w-xs">
        {['month', 'agenda'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`flex-1 rounded-xl border py-2 text-xs font-bold ${
              view === v
                ? 'border-primary-800 bg-primary-800 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {v === 'month' ? 'Month' : 'Agenda'}
          </button>
        ))}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wider ${
              filter === f.value
                ? 'border-primary-800 bg-primary-800 text-white'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card">
        <div className="text-sm font-bold text-slate-900">Google Calendar</div>
        <p className="text-xs text-slate-500">
          Export all events as a file and import into Google Calendar, or add
          individual events with the button on each item.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadIcsFile(filteredEvents)}
            className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-800"
          >
            Download .ics file
          </button>
          <a
            href={GOOGLE_CALENDAR_IMPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Open Google import
          </a>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          </div>

          <section className="space-y-2.5 xl:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
              {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}
            </h2>
            {selectedDayEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
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
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          Nothing scheduled for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredGroups.map(group => (
            <section key={group.date}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                {group.label}
              </h2>
              <div className="space-y-2.5">
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
    </PageShell>
  )
}
