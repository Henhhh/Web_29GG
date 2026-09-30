import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../../services/apiClient'
import type { AccountProfile, AuthUser } from '../authTypes'

export default function ProfileForm({ user, onSave }: { user: AuthUser; onSave: (profile: AccountProfile) => Promise<void> }) {
  const id = useId()
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!/^[+\d\s()-]{7,20}$/.test(phone.trim())) { setError('Please enter a valid phone number (7–20 characters).'); return }
    setError('')
    setSaving(true)
    try { await onSave({ fullName: fullName.trim(), phone: phone.trim() }) }
    catch (error) { setError(error instanceof ApiError ? Object.values(error.details).join(' ') || error.message : error instanceof Error ? error.message : 'Could not save profile.') }
    finally { setSaving(false) }
  }
  return <form className="account-profile" onSubmit={submit}>
    <p>{user.email}</p>
    <label htmlFor={`${id}-name`}>Full name</label>
    <input id={`${id}-name`} autoComplete="name" value={fullName} maxLength={100} required onChange={event => setFullName(event.target.value)} />
    <label htmlFor={`${id}-phone`}>Phone number</label>
    <input id={`${id}-phone`} type="tel" autoComplete="tel" value={phone} maxLength={20} required onChange={event => setPhone(event.target.value)} />
    <p>Your saved details will autofill the Contact section at checkout.</p>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <button type="submit" className="commerce-button" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
  </form>
}
