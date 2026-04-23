import { GoogleLogin } from '@react-oauth/google'

/**
 * Official Google Identity Services “Sign in with Google” button (outline / standard / large).
 * Renders the real GIS control — do not replace with a custom-styled fake.
 *
 * @see https://developers.google.com/identity/gsi/web/reference/js-reference
 */
export function GoogleSignInButton({ onSuccess, onError, disabled }) {
  if (disabled) {
    return (
      <div
        className="flex h-10 w-full max-w-[400px] items-center justify-center rounded border border-[#dadce0] bg-[#f8f9fa] text-sm text-[#5f6368] dark:border-[#5f6368] dark:bg-slate-800"
        aria-busy
      >
        Signing in…
      </div>
    )
  }

  return (
    <div className="google-sign-in-btn flex w-full max-w-[400px] justify-center">
      {/*
        GIS defaults: standard + outline + large = official “Sign in with Google” (white, border, G logo left).
      */}
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        type="standard"
        theme="outline"
        size="large"
        shape="rectangular"
        text="signin_with"
        logo_alignment="left"
        width={400}
      />
    </div>
  )
}
