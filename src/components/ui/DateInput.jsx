import { useEffect, useState } from 'react'
import { INPUT } from '../../constants/formStyles'
import { formatDisplayDate, parseDisplayDate } from '../../utils/policyDates'

/**
 * Date field that displays and accepts dd/mm/yy.
 * Value in/out is always ISO yyyy-MM-dd (or '').
 */
export default function DateInput({
  value = '',
  onChange,
  className = '',
  id,
  name,
  disabled,
  required,
  placeholder = 'dd/mm/yy',
}) {
  const [text, setText] = useState(() => formatDisplayDate(value))

  useEffect(() => {
    setText(formatDisplayDate(value))
  }, [value])

  const commitText = () => {
    if (!text.trim()) {
      onChange?.('')
      setText('')
      return
    }

    const iso = parseDisplayDate(text)
    if (iso) {
      onChange?.(iso)
      setText(formatDisplayDate(iso))
      return
    }

    setText(formatDisplayDate(value))
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        required={required}
        onChange={e => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitText()
          }
        }}
        className={`${INPUT} pr-11 ${className}`}
      />
      <input
        type="date"
        value={value || ''}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        className="absolute inset-y-0 right-2 my-auto h-9 w-9 cursor-pointer opacity-0"
        tabIndex={-1}
        aria-label="Choose date from calendar"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm-2 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H5z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </div>
  )
}
