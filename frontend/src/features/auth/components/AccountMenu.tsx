import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '../authTypes'
import './auth.css'

type AccountMenuProps = {
  user: AuthUser
  onLogout: () => void
}

export default function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const initial = user.username.trim().charAt(0).toUpperCase() || 'P'

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        className="account-menu__trigger"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="account-menu__avatar" aria-hidden="true">{initial}</span>
        <span className="account-menu__identity">
          <strong>{user.username}</strong>
          <small>Account</small>
        </span>
        <span className="account-menu__chevron" aria-hidden="true">{isOpen ? '^' : 'v'}</span>
      </button>

      {isOpen && (
        <div className="account-menu__popover" role="menu">
          <p>Signed in as</p>
          <strong>{user.email}</strong>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              onLogout()
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
