import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendWebPush } from '../_shared/webpush.ts'
import { buildPushPayload, collectDueItems, todayInNairobi } from '../_shared/dueItems.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function env(name, fallback = '') {
  return Deno.env.get(name) ?? fallback
}

function adminClient() {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase service credentials.')
  return createClient(url, key)
}

function vapidConfig() {
  const vapidPublicKey = env('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = env('VAPID_PRIVATE_KEY')
  const vapidSubject = env('VAPID_SUBJECT', 'mailto:hello@insureagent.app')
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys are not configured.')
  }
  return { vapidPublicKey, vapidPrivateKey, vapidSubject }
}

async function sendToSubscriptions(subscriptions, payload, vapid) {
  const staleEndpoints = []
  let sent = 0
  let failed = 0

  for (const subscription of subscriptions) {
    try {
      const result = await sendWebPush({
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        payload: JSON.stringify(payload),
        ...vapid,
      })
      if (result.status === 404 || result.status === 410) {
        staleEndpoints.push(subscription.endpoint)
        continue
      }
      if (!result.ok) {
        failed += 1
        continue
      }
      sent += 1
    } catch {
      failed += 1
    }
  }

  return { sent, failed, staleEndpoints }
}

async function handleTest(req) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Not signed in.' }, 401)

  const supabase = adminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Not signed in.' }, 401)

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('agent_id', userData.user.id)
    .eq('enabled', true)

  if (error) return json({ error: error.message }, 500)
  if (!subscriptions?.length) {
    return json({ error: 'No push subscription on this account yet.' }, 400)
  }

  const result = await sendToSubscriptions(
    subscriptions,
    {
      title: 'InsureAgent test alert',
      body: 'Push notifications are working. You will get due-date reminders on this phone.',
      tag: 'insureagent-test',
      url: '/reminders',
    },
    vapidConfig(),
  )

  if (result.staleEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', result.staleEndpoints)
  }

  if (result.sent === 0) {
    return json({ error: 'The push service rejected the test alert.', ...result }, 502)
  }

  return json({ ok: true, ...result })
}

async function handleCron() {
  const supabase = adminClient()
  const vapid = vapidConfig()
  const today = todayInNairobi()

  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('enabled', true)

  if (subError) return json({ error: subError.message }, 500)
  if (!subscriptions?.length) return json({ ok: true, agents: 0, sent: 0 })

  const agentIds = [...new Set(subscriptions.map(row => row.agent_id))]

  const [
    { data: clients, error: clientsError },
    { data: vehicles, error: vehiclesError },
    { data: schedules, error: schedulesError },
    { data: prospects, error: prospectsError },
    { data: reminders, error: remindersError },
    { data: alreadySent, error: sentError },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, agent_id').in('agent_id', agentIds),
    supabase
      .from('vehicles')
      .select('id, agent_id, client_id, registration, expiry_date')
      .in('agent_id', agentIds),
    supabase
      .from('payment_schedules')
      .select('id, vehicle_id, agent_id, installments')
      .in('agent_id', agentIds),
    supabase
      .from('prospects')
      .select('id, agent_id, full_name, follow_up_date, stage')
      .in('agent_id', agentIds),
    supabase
      .from('reminders')
      .select('id, agent_id, trigger_type, scheduled_at, status, message')
      .in('agent_id', agentIds)
      .eq('status', 'scheduled'),
    supabase.from('push_sends').select('agent_id, event_key').in('agent_id', agentIds),
  ])

  const loadError =
    clientsError || vehiclesError || schedulesError || prospectsError || remindersError || sentError
  if (loadError) return json({ error: loadError.message }, 500)

  const sentKeys = new Set((alreadySent ?? []).map(row => `${row.agent_id}:${row.event_key}`))
  const clientsById = new Map((clients ?? []).map(row => [row.id, row]))
  const vehiclesByAgent = new Map()
  const schedulesByAgent = new Map()
  const prospectsByAgent = new Map()
  const remindersByAgent = new Map()
  const subsByAgent = new Map()

  const group = (map, row) => {
    const list = map.get(row.agent_id) ?? []
    list.push(row)
    map.set(row.agent_id, list)
  }

  for (const row of vehicles ?? []) group(vehiclesByAgent, row)
  for (const row of schedules ?? []) group(schedulesByAgent, row)
  for (const row of prospects ?? []) group(prospectsByAgent, row)
  for (const row of reminders ?? []) group(remindersByAgent, row)
  for (const row of subscriptions) group(subsByAgent, row)

  const staleEndpoints = []
  let agentsNotified = 0
  let notificationsSent = 0

  for (const agentId of agentIds) {
    const items = collectDueItems({
      today,
      clientsById,
      vehicles: vehiclesByAgent.get(agentId) ?? [],
      schedules: schedulesByAgent.get(agentId) ?? [],
      prospects: prospectsByAgent.get(agentId) ?? [],
      reminders: remindersByAgent.get(agentId) ?? [],
    }).filter(item => !sentKeys.has(`${agentId}:${item.key}`))

    if (!items.length) continue

    const payload = buildPushPayload(items)
    const result = await sendToSubscriptions(subsByAgent.get(agentId) ?? [], payload, vapid)
    staleEndpoints.push(...result.staleEndpoints)

    if (result.sent > 0) {
      agentsNotified += 1
      notificationsSent += result.sent
      await supabase.from('push_sends').upsert(
        items.map(item => ({
          agent_id: agentId,
          event_key: item.key,
        })),
        { onConflict: 'agent_id,event_key' },
      )
    }
  }

  if (staleEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }

  return json({
    ok: true,
    today,
    agents: agentsNotified,
    sent: notificationsSent,
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'cron'

    if (mode === 'test') {
      return await handleTest(req)
    }

    const cronSecret = env('CRON_SECRET')
    const provided = req.headers.get('x-cron-secret') || body.secret
    if (!cronSecret || provided !== cronSecret) {
      return json({ error: 'Unauthorized.' }, 401)
    }

    return await handleCron()
  } catch (error) {
    return json({ error: error.message || 'Push notify failed.' }, 500)
  }
})
