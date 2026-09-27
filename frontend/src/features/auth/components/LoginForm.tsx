import { useState, type FormEvent } from 'react'
import type { LoginCredentials } from '../authTypes'
import './auth.css'

type LoginFormProps = {
  error?: string
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void
}

export default function LoginForm({ error, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setValidationError('Enter your email and password.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setValidationError('Enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setValidationError('Password must contain at least 6 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ email: normalizedEmail, password })
    } finally {
      setIsSubmitting(false)
    }
  }

  const message = validationError || error

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="player@example.com"
          autoComplete="email"
          autoFocus
          aria-invalid={Boolean(message)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <div className="auth-password">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={Boolean(message)}
          />
          <button
            type="button"
            className="auth-password__toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {message && (
        <p className="auth-form__error" role="alert">
          {message}
        </p>
      )}

      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Login'}
      </button>
    </form>
  )
}
