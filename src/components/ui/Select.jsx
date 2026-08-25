import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

const TRIGGER_MD =
  'flex w-full cursor-pointer items-center rounded-xl border border-stone-200 bg-white py-3 pl-3.5 pr-10 text-left text-ink shadow-soft transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-ink-faint'

const TRIGGER_SM =
  'flex min-w-0 max-w-full cursor-pointer items-center rounded-lg border border-stone-200 bg-white py-1 pl-2.5 pr-8 text-left text-xs font-semibold text-ink transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-ink-faint'

const SEARCH_THRESHOLD = 8

function Chevron({ className }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function optionText(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(optionText).join('')
  if (isValidElement(node)) return optionText(node.props.children)
  return ''
}

function collectOptions(nodes, group) {
  const list = []
  Children.forEach(nodes, child => {
    if (!isValidElement(child)) return
    if (child.type === Fragment) {
      list.push(...collectOptions(child.props.children, group))
      return
    }
    if (child.type === 'optgroup') {
      list.push(...collectOptions(child.props.children, child.props.label))
      return
    }
    if (child.type !== 'option') return
    const label = optionText(child.props.children)
    const value =
      child.props.value !== undefined ? String(child.props.value) : label
    list.push({
      value,
      label,
      disabled: Boolean(child.props.disabled),
      group,
    })
  })
  return list
}

function emitChange(onChange, name, value) {
  onChange?.({
    target: { name, value },
    currentTarget: { name, value },
  })
}

export default function Select({
  className = '',
  size = 'md',
  value,
  disabled,
  children,
  onChange,
  required,
  name,
  id,
  title,
  searchable: searchableProp,
  'aria-label': ariaLabel,
  ...props
}) {
  const options = useMemo(() => collectOptions(children), [children])
  const compact = size === 'sm'
  const empty = value === '' || value == null
  const selected = options.find(option => option.value === String(value ?? ''))
  const selectedLabel = selected?.label || 'Select'
  const searchable =
    searchableProp ?? options.filter(option => option.value !== '').length >= SEARCH_THRESHOLD

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const listId = useId()
  const searchId = useId()
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(option => option.label.toLowerCase().includes(q))
  }, [options, query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const selectOption = option => {
    if (option.disabled) return
    emitChange(onChange, name, option.value)
    close()
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const selectedIdx = options.findIndex(
      option => option.value === String(value ?? ''),
    )
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0)
    const frame = window.requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus()
      menuRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
    // Only sync highlight/focus when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onTriggerKeyDown = event => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const onMenuKeyDown = event => {
    if (!filtered.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => {
        const next = index + 1
        return next >= filtered.length ? 0 : next
      })
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => {
        const next = index - 1
        return next < 0 ? filtered.length - 1 : next
      })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) selectOption(option)
    }
  }

  const placeholderLabel = options.find(option => option.value === '')?.label
  const menuTitle = title || ariaLabel || placeholderLabel || 'Select an option'

  const menu = open
    ? createPortal(
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={close}
          />
          <div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuTitle}
            className="sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-panel lg:bottom-8 lg:max-h-[min(36rem,80vh)] lg:rounded-3xl"
            onKeyDown={onMenuKeyDown}
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-3 lg:hidden">
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 pb-2 lg:pt-4">
              <p className="min-w-0 truncate font-display text-lg text-ink">
                {menuTitle}
              </p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                Done
              </button>
            </div>
            {searchable ? (
              <div className="px-4 pb-2">
                <label htmlFor={searchId} className="sr-only">
                  Search options
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" />
                    </svg>
                  </span>
                  <input
                    ref={searchRef}
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={event => {
                      setQuery(event.target.value)
                      setActiveIndex(0)
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') event.preventDefault()
                      onMenuKeyDown(event)
                    }}
                    placeholder="Search..."
                    className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1">
              <ul id={listId} role="listbox" aria-label={menuTitle}>
                {filtered.length === 0 ? (
                  <li className="px-3.5 py-3 text-sm text-ink-faint">No matches.</li>
                ) : (
                  filtered.map((option, index) => {
                    const isSelected = option.value === String(value ?? '')
                    const isActive = index === activeIndex
                    return (
                      <li key={`${option.group || ''}:${option.value}:${option.label}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-selected={isSelected || undefined}
                          disabled={option.disabled}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectOption(option)}
                          className={`flex min-h-12 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            isSelected
                              ? 'bg-primary-50 font-semibold text-primary-800'
                              : isActive
                                ? 'bg-stone-50 text-ink'
                                : 'text-ink hover:bg-stone-50'
                          }`}
                        >
                          <span className="min-w-0 truncate">{option.label}</span>
                          {isSelected ? (
                            <CheckIcon className="h-4 w-4 shrink-0 text-primary-600" />
                          ) : null}
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div
      className={`relative min-w-0 ${compact ? 'inline-block max-w-full' : 'w-full'} ${className}`}
    >
      <select
        tabIndex={-1}
        aria-hidden
        name={name}
        required={required}
        disabled={disabled}
        value={value ?? ''}
        onChange={event => emitChange(onChange, name, event.target.value)}
        className="pointer-events-none sr-only"
      >
        {options.map(option => (
          <option
            key={`native:${option.group || ''}:${option.value}:${option.label}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      <button
        {...props}
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        title={selectedLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (disabled) return
          setOpen(current => !current)
        }}
        onKeyDown={onTriggerKeyDown}
        className={`${compact ? TRIGGER_SM : TRIGGER_MD} ${
          empty ? 'text-ink-faint' : ''
        } ${open ? 'border-primary-400 ring-2 ring-primary-500/20' : ''}`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
      </button>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 flex items-center ${
          compact ? 'right-2' : 'right-3.5'
        } ${disabled ? 'text-ink-faint/70' : 'text-ink-faint'}`}
      >
        <Chevron
          className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </span>
      {menu}
    </div>
  )
}
