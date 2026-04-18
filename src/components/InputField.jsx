/**
 * Labeled input — rounded, airy spacing for light forms.
 */
export function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  disabled,
  placeholder,
}) {
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
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-white/50 transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:shadow-slate-950/40 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}
