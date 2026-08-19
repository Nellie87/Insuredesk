import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { deleteClientSession, listClientSessions } from '../lib/clientSessions'

export function useClientSessions() {
  const agentId = useAppStore(s => s.session?.user?.id)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!agentId) {
      setSessions([])
      setLoading(false)
      return
    }

    const rows = await listClientSessions(agentId)
    setSessions(rows)
    setLoading(false)
  }, [agentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const discardSession = useCallback(
    async id => {
      await deleteClientSession(id)
      await refresh()
    },
    [refresh],
  )

  return { sessions, loading, refresh, discardSession }
}
