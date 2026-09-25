import { useCallback, useState } from 'react'
import AccountMenu from '../components/AccountMenu'
import AuthModal from '../components/AuthModal'
import type { AuthUser, AuthView, LoginCredentials, RegisterCredentials } from '../authTypes'
import './AuthDemo.css'

const SESSION_KEY = '29gg-auth-demo-user'

function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) as AuthUser : null
  } catch {
    return null
  }
}

function usernameFromEmail(email: string) {
  const rawName = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return rawName.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Player'
}

export default function AuthDemo() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [loginError, setLoginError] = useState('')
  const [notice, setNotice] = useState('')

  const closeLogin = useCallback(() => {
    setAuthView(null)
    setLoginError('')
  }, [])

  async function handleLogin({ email }: LoginCredentials) {
    setLoginError('')

    const nextUser: AuthUser = {
      id: 'demo-user',
      username: usernameFromEmail(email),
      email,
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    setNotice('Logged in successfully.')
    closeLogin()
  }

  async function handleRegister({ username, email }: RegisterCredentials) {
    const nextUser: AuthUser = {
      id: 'demo-user',
      username,
      email,
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    setNotice('Account created successfully.')
    closeLogin()
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setNotice('You have been logged out.')
  }

  return (
    <div className="auth-demo">
      <header className="auth-demo__header">
        <a className="auth-demo__brand" href="#top" aria-label="29GG home">
          29<span>GG</span>
        </a>
        <nav aria-label="Account demo navigation">
          <a href="#account">Account</a>
        </nav>
        {user ? (
          <AccountMenu user={user} onLogout={handleLogout} />
        ) : (
          <div className="auth-demo__actions">
            <button
              className="auth-demo__login"
              type="button"
              onClick={() => {
                setLoginError('')
                setAuthView('login')
              }}
            >
              Login
            </button>
            <button
              className="auth-demo__register"
              type="button"
              onClick={() => {
                setLoginError('')
                setAuthView('register')
              }}
            >
              Register
            </button>
          </div>
        )}
      </header>

      <main id="top" className="auth-demo__main">
        <section className="auth-demo__visual" aria-label="Player using a VR headset">
          <img
            src="https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1400&h=1000&fit=crop&auto=format"
            alt="Player using a VR headset"
          />
          <div className="auth-demo__visual-copy">
            <p>PLAYER ACCESS / 29GG</p>
            <h1>{user ? `Welcome, ${user.username}` : 'Enter the arena'}</h1>
          </div>
        </section>

        <section id="account" className="auth-demo__account">
          <div>
            <p className="auth-kicker">ACCOUNT STATUS</p>
            <h2>{user ? 'Session active' : 'Ready when you are'}</h2>
            <p>
              {user
                ? `Signed in with ${user.email}`
                : 'Sign in to continue with your player account.'}
            </p>
          </div>
          {user ? (
            <button className="auth-demo__logout" type="button" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <button className="auth-demo__primary" type="button" onClick={() => setAuthView('login')}>
              Login
            </button>
          )}
        </section>
      </main>

      {notice && (
        <div className="auth-demo__toast" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">Close</button>
        </div>
      )}

      <AuthModal
        isOpen={authView !== null}
        view={authView ?? 'login'}
        error={loginError}
        onClose={closeLogin}
        onViewChange={setAuthView}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    </div>
  )
}
