import { openDB } from 'idb'

const DB_NAME = 'insure-agent-db'
const DB_VERSION = 4

// Opens (or upgrades) the local IndexedDB database
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // Clients store
      if (!db.objectStoreNames.contains('clients')) {
        const clientStore = db.createObjectStore('clients', { keyPath: 'id' })
        clientStore.createIndex('agent_id', 'agent_id')
        clientStore.createIndex('status', 'status')
      }

      // Vehicles store
      if (!db.objectStoreNames.contains('vehicles')) {
        const vehicleStore = db.createObjectStore('vehicles', { keyPath: 'id' })
        vehicleStore.createIndex('client_id', 'client_id')
        vehicleStore.createIndex('expiry_date', 'expiry_date')
      }

      // Payment schedules store
      if (!db.objectStoreNames.contains('payment_schedules')) {
        const scheduleStore = db.createObjectStore('payment_schedules', { keyPath: 'id' })
        scheduleStore.createIndex('vehicle_id', 'vehicle_id')
      }

      // Payments store
      if (!db.objectStoreNames.contains('payments')) {
        const paymentStore = db.createObjectStore('payments', { keyPath: 'id' })
        paymentStore.createIndex('vehicle_id', 'vehicle_id')
        paymentStore.createIndex('client_id', 'client_id')
        paymentStore.createIndex('synced', 'synced')
      }

      // Commissions store
      if (!db.objectStoreNames.contains('commissions')) {
        const commissionStore = db.createObjectStore('commissions', { keyPath: 'id' })
        commissionStore.createIndex('agent_id', 'agent_id')
        commissionStore.createIndex('period_month', 'period_month')
      }

      // Prospects store
      if (!db.objectStoreNames.contains('prospects')) {
        const prospectStore = db.createObjectStore('prospects', { keyPath: 'id' })
        prospectStore.createIndex('agent_id', 'agent_id')
        prospectStore.createIndex('stage', 'stage')
      }

      // Pending sync queue - stores operations to push when back online
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
        syncStore.createIndex('table', 'table')
        syncStore.createIndex('created_at', 'created_at')
      }

      // Reminders store (v3)
      if (!db.objectStoreNames.contains('reminders')) {
        const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' })
        reminderStore.createIndex('agent_id', 'agent_id')
        reminderStore.createIndex('scheduled_at', 'scheduled_at')
      }

      // In-progress add-client sessions (v4) — local drafts, not synced
      if (!db.objectStoreNames.contains('client_sessions')) {
        const sessionStore = db.createObjectStore('client_sessions', { keyPath: 'id' })
        sessionStore.createIndex('agent_id', 'agent_id')
        sessionStore.createIndex('updated_at', 'updated_at')
      }

      if (oldVersion < 3 && transaction) {
        const paymentStore = transaction.objectStore('payments')
        if (!paymentStore.indexNames.contains('agent_id')) {
          paymentStore.createIndex('agent_id', 'agent_id')
        }
      }
    },
  })
}

// ─── Generic CRUD helpers ─────────────────────────────────────────────────────

export async function localGet(storeName, id) {
  const db = await getDB()
  return db.get(storeName, id)
}

export async function localGetAll(storeName, indexName, value) {
  const db = await getDB()
  if (indexName && value !== undefined) {
    return db.getAllFromIndex(storeName, indexName, value)
  }
  return db.getAll(storeName)
}

export async function localPut(storeName, record) {
  const db = await getDB()
  return db.put(storeName, record)
}

export async function localPutMany(storeName, records) {
  const db = await getDB()
  const tx = db.transaction(storeName, 'readwrite')
  await Promise.all([
    ...records.map(r => tx.store.put(r)),
    tx.done,
  ])
}

export async function localDelete(storeName, id) {
  const db = await getDB()
  return db.delete(storeName, id)
}

// ─── Sync queue helpers ───────────────────────────────────────────────────────

export async function addToSyncQueue(item) {
  const db = await getDB()
  return db.put('sync_queue', {
    ...item,
    id: item.id || crypto.randomUUID(),
    created_at: new Date().toISOString(),
  })
}

export async function getPendingSyncItems() {
  const db = await getDB()
  return db.getAll('sync_queue')
}

export async function removeSyncItem(id) {
  const db = await getDB()
  return db.delete('sync_queue', id)
}

export async function clearSyncQueue() {
  const db = await getDB()
  return db.clear('sync_queue')
}
