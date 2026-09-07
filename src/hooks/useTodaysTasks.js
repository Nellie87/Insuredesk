import { useMemo } from 'react'
import { useReminders } from './useReminders'
import { getTodaysTasks, summarizeTodaysTasks } from '../utils/todaysTasks'

export function useTodaysTasks() {
  const { clients, prospects, reminders, loading } = useReminders()

  const tasks = useMemo(
    () => getTodaysTasks({ clients, prospects, reminders }),
    [clients, prospects, reminders],
  )

  const summary = useMemo(() => summarizeTodaysTasks(tasks), [tasks])

  return { tasks, summary, loading }
}
