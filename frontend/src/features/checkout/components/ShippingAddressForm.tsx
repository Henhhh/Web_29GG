import { useId } from 'react'
import type { FormProps } from '../models/checkoutModel'
import { provinces } from '../data/vietnamDivisions'
import CheckoutField from './CheckoutField'
export default function ShippingAddressForm({ value, onChange }: FormProps) {
  const id = useId()
  const province = provinces.find(item => item.code === value.city)
  return <div>
    <div className="checkout-field">
      <label htmlFor={`${id}-city`}>City — Province / City</label>
      <select id={`${id}-city`} name="city" value={value.city} required
        onChange={event => onChange({ ...value, city: event.target.value, district: '' })}>
        <option value="">Select a province or city</option>
        {provinces.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
    </div>
    <div className="checkout-field">
      <label htmlFor={`${id}-ward`}>District — Ward / Commune / Special Zone</label>
      <select id={`${id}-ward`} name="district" value={value.district} disabled={!province} required
        aria-describedby={!province ? `${id}-hint` : undefined}
        onChange={event => onChange({ ...value, district: event.target.value })}>
        <option value="">{province ? 'Select a ward / commune / special zone' : 'Select a province or city first'}</option>
        {province?.wards.map(ward => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
      </select>
      {!province && <p id={`${id}-hint`} className="commerce-muted">Select City above to see its wards and communes.</p>}
    </div>
    <CheckoutField value={value} onChange={onChange} name="address" label="Street Address — House number, street" />
  </div>
}
