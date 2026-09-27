import { useId } from 'react'
import type { FormProps, CheckoutForm } from '../models/checkoutModel'
type TextField = Exclude<keyof CheckoutForm, 'delivery' | 'shipping' | 'store' | 'payment'>
type Props = FormProps & { name: TextField; label: string; type?: string; placeholder?: string }
export default function CheckoutField({ name, label, value, onChange, type = 'text', placeholder }: Props) {
  const id = useId()
  return <div className="checkout-field"><label htmlFor={id}>{label}</label><input id={id} name={name} type={type} value={value[name]} placeholder={placeholder} required onChange={event => onChange({ ...value, [name]: event.target.value })} /></div>
}
