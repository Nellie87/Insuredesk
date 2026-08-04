import PageShell from '../components/layout/PageShell'

export default function CommissionsPage() {
  return (
    <PageShell>
      <div className="lg:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
          Earnings
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          Commissions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This module is coming in Phase 2.
        </p>
      </div>

      <p className="hidden text-sm text-slate-500 lg:block">
        This module is coming in Phase 2.
      </p>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-400 shadow-card">
        Commission tracking will appear here soon.
      </div>
    </PageShell>
  )
}
