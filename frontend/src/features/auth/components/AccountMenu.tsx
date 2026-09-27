import { useEffect, useRef, useState } from 'react'
import type { AuthUser, AccountProfile } from '../authTypes'
import Overlay from '../../../components/ui/Overlay'
import ProfileForm from './ProfileForm'
import './auth.css'

type AccountMenuProps = {
  user: AuthUser
  onLogout: () => void
  onProfileSave: (profile: AccountProfile) => void
}

export default function AccountMenu({ user, onLogout, onProfileSave }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
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
      >
        <span className="account-menu__avatar" aria-hidden="true">{initial}</span>
        <span className="account-menu__identity">
          <strong>{user.username}</strong>
          <small>Account</small>
        </span>
        <span className="account-menu__chevron" aria-hidden="true">{isOpen ? '^' : 'v'}</span>
      </button>

      {isOpen && (
        <div className="account-menu__popover" aria-label="Account information">
          <p>Signed in as</p>
          <strong>{user.email}</strong>
          <dl className="account-menu__profile"><dt>Full name</dt><dd>{user.fullName || 'Not provided'}</dd><dt>Phone number</dt><dd>{user.phone || 'Not provided'}</dd></dl>
          <button type="button" className="account-menu__edit" onClick={() => { setIsOpen(false); setEditing(true) }}>Edit profile</button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onLogout()
            }}
          >
            Log out
          </button>
        </div>
      )}
      {editing && <Overlay title="Personal information" onClose={() => setEditing(false)}><ProfileForm user={user} onSave={profile => { onProfileSave(profile); setEditing(false); setIsOpen(true) }} /></Overlay>}
    </div>
  )
}
