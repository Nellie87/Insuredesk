// ─── Agent ───────────────────────────────────────────────────────────────────

export interface Agent {
  id: string
  name: string
  phone: string
  email: string
  commission_rates: CommissionRate[]
  created_at: string
}

export interface CommissionRate {
  insurer: string
  policy_type: PolicyType
  rate: number // percentage e.g. 12.5
}

// ─── Client ──────────────────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'overdue' | 'expiring_soon' | 'fully_paid' | 'lapsed'

export interface Client {
  id: string
  agent_id: string
  name: string
  phone: string
  id_number: string
  email?: string
  address?: string
  /** General client notes (internal) */
  notes?: string
  status: ClientStatus
  created_at: string
  updated_at: string
  // Joined relations
  vehicles?: Vehicle[]
}

// ─── Vehicle & Policy ────────────────────────────────────────────────────────

export type PolicyType = 'comprehensive' | 'third_party' | 'third_party_fire_theft'
export type VehicleUse   = 'private' | 'commercial' | 'psv'

export interface Vehicle {
  id: string
  client_id: string
  registration: string
  /** Chassis / VIN - required if registration is empty */
  chassis?: string | null
  make: string
  model: string
  year: number
  engine_capacity?: string
  vehicle_value: number
  use_type: VehicleUse
  insurer: string
  policy_number: string
  policy_type: PolicyType
  start_date: string   // ISO date string
  expiry_date: string  // ISO date string
  sum_insured: number
  premium: number
  vehicle_notes?: string | null
  cover_notes?: string | null
  payment_notes?: string | null
  created_at: string
  // Joined
  payment_schedule?: PaymentSchedule
  payment_schedules?: PaymentSchedule[]
}

// ─── Payment Schedule ─────────────────────────────────────────────────────────

export interface Installment {
  number: number
  due_date: string     // ISO date string
  amount: number
  paid: boolean
  paid_at?: string | null
  /** Partial credit when not fully paid yet */
  paid_amount?: number | null
}

export interface PaymentSchedule {
  id: string
  vehicle_id: string
  agent_id?: string
  total_premium: number
  down_payment: number
  down_payment_paid: boolean
  down_payment_paid_at?: string | null
  installment_count: number
  installments: Installment[]
  created_at: string
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export type PaymentMethod = 'mpesa' | 'bank_transfer' | 'cash' | 'cheque'

export interface Payment {
  id: string
  schedule_id: string
  vehicle_id: string
  client_id: string
  amount: number
  date: string
  method: PaymentMethod
  reference?: string    // M-Pesa code or bank ref
  logged_by: string     // agent id
  notes?: string
  synced: boolean       // false = pending offline sync
  created_at: string
}

// ─── Commission ───────────────────────────────────────────────────────────────

export type CommissionStatus = 'pending' | 'confirmed' | 'paid_out'

export interface Commission {
  id: string
  vehicle_id: string
  agent_id: string
  rate: number
  amount: number
  status: CommissionStatus
  period_month: string  // e.g. "2025-07"
  created_at: string
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export type ReminderTrigger   = 'payment_due_14d' | 'payment_due_7d' | 'payment_due_3d' | 'payment_due_1d' | 'payment_due_today' | 'payment_overdue_1d' | 'policy_expiry_30d' | 'policy_expiry_14d' | 'policy_expiry_7d' | 'policy_expiry_today'
export type ReminderChannel   = 'whatsapp' | 'sms' | 'push'
export type ReminderStatus    = 'scheduled' | 'sent' | 'delivered' | 'failed'

export interface Reminder {
  id: string
  vehicle_id: string
  client_id: string
  trigger_type: ReminderTrigger
  channel: ReminderChannel
  scheduled_at: string
  sent_at?: string
  status: ReminderStatus
  message: string
}

export interface PushSubscriptionRecord {
  id: string
  agent_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent?: string
  enabled: boolean
  created_at: string
  updated_at: string
}

// ─── Calculator inputs ────────────────────────────────────────────────────────

export interface CalculatorInput {
  total_premium: number
  down_payment_percent: number  // e.g. 40
  installment_months: number    // 1 | 2 | 3 | 6 | 12
  first_payment_date: string    // ISO date
  commission_rate: number       // e.g. 12.5
}

export interface CalculatorResult {
  down_payment: number
  remaining_balance: number
  monthly_installment: number
  installment_schedule: { due_date: string; amount: number }[]
  commission: number
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_clients: number
  total_premium_this_month: number
  commission_confirmed_this_month: number
  policies_expiring_30d: number
  overdue_count: number
}

// ─── Offline sync ────────────────────────────────────────────────────────────

export interface PendingSyncItem {
  id: string
  table: 'payments' | 'clients' | 'vehicles' | 'payment_schedules'
  operation: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown>
  created_at: string
}
