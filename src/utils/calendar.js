/**
 * Calendar event type colors (Google Calendar–style)
 */
export const EVENT_COLORS = {
  payment: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    label: 'Payment due',
  },
  renewal: {
    dot: 'bg-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    label: 'Policy renewal',
  },
  follow_up: {
    dot: 'bg-violet-500',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-800',
    label: 'Prospect follow-up',
  },
  reminder: {
    dot: 'bg-teal-500',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-800',
    label: 'Scheduled reminder',
  },
}

export function getEventColors(type) {
  return EVENT_COLORS[type] ?? EVENT_COLORS.reminder
}

function formatIcsDate(dateStr) {
  return dateStr.replace(/-/g, '')
}

function escapeIcs(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Opens Google Calendar "create event" with pre-filled fields (no OAuth required).
 */
export function googleCalendarUrl({ title, date, description }) {
  const start = formatIcsDate(date)
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 1)
  const end = formatIcsDate(endDate.toISOString().slice(0, 10))

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: description ?? '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function eventToGoogleCalendar(event) {
  const description = [
    event.subtitle,
    event.installment?.amount ? `Amount: ${event.installment.amount}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return googleCalendarUrl({
    title: event.title,
    date: event.date,
    description,
  })
}

/**
 * Download a .ics file — import into Google Calendar via Settings → Import.
 */
export function downloadIcsFile(events, filename = 'insureagent-calendar.ics') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InsureAgent//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    const start = formatIcsDate(event.date)
    const endDate = new Date(event.date)
    endDate.setDate(endDate.getDate() + 1)
    const end = formatIcsDate(endDate.toISOString().slice(0, 10))

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@insureagent.app`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString().slice(0, 10))}T000000Z`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.subtitle ?? '')}`,
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Google Calendar import instructions URL
 */
export const GOOGLE_CALENDAR_IMPORT_URL =
  'https://calendar.google.com/calendar/u/0/r/settings/export'
