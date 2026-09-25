import { useState, type FormEvent } from 'react'
import type { RegisterCredentials } from '../authTypes'
import './auth.css'

type RegisterFormProps = {
  error?: string
  onSubmit: (credentials: RegisterCredentials) => Promise<void> | void
}

export default function RegisterForm({ error, onSubmit }: RegisterFormProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')

    const normalizedUsername = username.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedUsername || !normalizedEmail || !password || !confirmPassword) {
      setValidationError('Complete all account fields.')
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

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        confirmPassword,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const message = validationError || error

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label htmlFor="register-username">Username</label>
        <input
          id="register-username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="YourGamertag"
          autoComplete="username"
          autoFocus
          aria-invalid={Boolean(message)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="player@example.com"
          autoComplete="email"
          aria-invalid={Boolean(message)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="new-password"
          aria-invalid={Boolean(message)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-confirm-password">Confirm password</label>
        <input
          id="register-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          aria-invalid={Boolean(message)}
        />
      </div>

      {message && <p className="auth-form__error" role="alert">{message}</p>}

      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
