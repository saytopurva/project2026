import { useId, useState } from 'react'

/** Shared input styles — matches InputField for visual consistency. */
const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-4 pr-11 text-sm text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40'

/**
 * Password input with an inline show/hide toggle (eye icon).
 * Uses useState so the field defaults to hidden (type="password").
 */
export function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  error,
  autoComplete = 'current-password',
  disabled,
  placeholder,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const reactId = useId()
  const id = idProp || `password-${reactId}`

  return (
    <div className="w-full text-left">
      {label ? (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClassName}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
        />

        {/* Icon sits inside the field on the right; extra pr-11 on input avoids overlap */}
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-2xl text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          tabIndex={disabled ? -1 : 0}
        >
          <span
            className="transition-opacity duration-200"
            aria-hidden
          >
            {showPassword ? <IconEyeOff /> : <IconEye />}
          </span>
        </button>
      </div>

      {error ? (
        <p
          id={`${id}-err`}
          className="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Eye open — password is hidden; clicking will reveal. */
function IconEye() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  )
}

/** Eye with slash — password is visible; clicking will hide. */
function IconEyeOff() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  )
}
