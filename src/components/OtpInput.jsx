import { useCallback, useEffect, useRef } from 'react'

const LENGTH = 6

/**
 * Six OTP boxes with auto-advance, paste, and initial focus on first cell.
 */
export function OtpInput({ value, onChange, disabled }) {
  const inputsRef = useRef([])

  const chars = []
  const v = String(value || '')
  for (let i = 0; i < LENGTH; i++) chars.push(v[i] || '')

  useEffect(() => {
    if (!disabled) {
      inputsRef.current[0]?.focus()
    }
  }, [disabled])

  const focusAt = (i) => {
    const el = inputsRef.current[i]
    if (el) el.focus()
  }

  const setFromString = useCallback(
    (str) => {
      const clean = str.replace(/\D/g, '').slice(0, LENGTH)
      onChange(clean)
    },
    [onChange]
  )

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (raw.length > 1) {
      setFromString(raw)
      focusAt(Math.min(index + raw.length, LENGTH - 1))
      return
    }
    const digit = raw.slice(-1) || ''
    const next = v.slice(0, index) + digit + v.slice(index + 1)
    onChange(next.slice(0, LENGTH))
    if (digit && index < LENGTH - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      focusAt(index - 1)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    setFromString(text)
    const len = text.replace(/\D/g, '').length
    focusAt(Math.min(Math.max(len - 1, 0), LENGTH - 1))
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={chars[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-10 rounded-2xl border border-slate-200 bg-slate-50/80 text-center text-lg font-semibold text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
