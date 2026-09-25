import { useEffect } from 'react'
import type { AuthView, LoginCredentials, RegisterCredentials } from '../authTypes'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import './auth.css'

type AuthModalProps = {
  isOpen: boolean
  view: AuthView
  error?: string
  onClose: () => void
  onViewChange: (view: AuthView) => void
  onLogin: (credentials: LoginCredentials) => Promise<void> | void
  onRegister: (credentials: RegisterCredentials) => Promise<void> | void
}

export default function AuthModal({
  isOpen,
  view,
  error,
  onClose,
  onViewChange,
  onLogin,
  onRegister,
}: AuthModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="auth-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="auth-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <span className="auth-modal__accent auth-modal__accent--top" />
        <span className="auth-modal__accent auth-modal__accent--bottom" />

        <div className="auth-modal__heading">
          <div>
            <p className="auth-kicker">29GG PLAYER ACCOUNT</p>
            <h2 id="auth-modal-title">
              {view === 'login' ? 'Welcome' : 'Join the'}{' '}
              <span>{view === 'login' ? 'back' : 'arena'}</span>
            </h2>
          </div>
          <button className="auth-modal__close" type="button" onClick={onClose} aria-label="Close account dialog">
            &times;
          </button>
        </div>

        <div className="auth-modal__tabs" role="tablist" aria-label="Account access">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'login'}
            className={view === 'login' ? 'auth-modal__tab auth-modal__tab--active' : 'auth-modal__tab'}
            onClick={() => onViewChange('login')}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'register'}
            className={view === 'register' ? 'auth-modal__tab auth-modal__tab--active' : 'auth-modal__tab'}
            onClick={() => onViewChange('register')}
          >
            Create account
          </button>
        </div>

        {view === 'login' ? (
          <LoginForm error={error} onSubmit={onLogin} />
        ) : (
          <RegisterForm error={error} onSubmit={onRegister} />
        )}
      </section>
    </div>
  )
}
