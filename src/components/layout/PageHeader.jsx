export default function PageHeader({ description, actions, className = '' }) {
  if (!description && !actions) return null

  return (
    <div
      className={`flex items-center justify-between gap-3 ${className}`.trim()}
    >
      {description ? (
        <p className="hidden min-w-0 text-sm text-ink-muted lg:block">
          {description}
        </p>
      ) : (
        <span className="hidden lg:block" />
      )}
      {actions ? (
        <div className="ml-auto flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
