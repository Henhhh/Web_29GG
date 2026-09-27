import { useId, useState } from 'react'
import type { FormProps } from '../models/checkoutModel'
import CheckoutField from './CheckoutField'
export default function PaymentForm({ value, onChange }: FormProps) {
  const id = useId()
  const [qrUnavailable, setQrUnavailable] = useState(false)
  return <fieldset><legend>04 / Payment method</legend><div className="checkout-payments">{(['card', 'banking', 'cash'] as const).map(method => <label className="checkout-choice" key={method}><input type="radio" name={id} checked={value.payment === method} onChange={() => onChange({ ...value, payment: method })} />{method === 'banking' ? 'QR BANKING' : method.toUpperCase()}</label>)}</div>
    {value.payment === 'card' && <p className="commerce-muted">Demo payment only. No money will be charged. Use test card details only.</p>}
    {value.payment === 'card' ? <><CheckoutField value={value} onChange={onChange} name="cardName" label="Name on card" /><CheckoutField value={value} onChange={onChange} name="cardNumber" label="Card number (demo)" placeholder="4242 4242 4242 4242" /><div className="checkout-columns"><CheckoutField value={value} onChange={onChange} name="expiry" label="Expiry (MM/YY)" placeholder="12/30" /><CheckoutField value={value} onChange={onChange} name="cvv" label="CVV (demo)" type="password" placeholder="123" /></div></> : value.payment === 'banking' ? <div className="checkout-banking">
      {qrUnavailable ? <p role="status">QR code is currently unavailable.</p> : <img src="/payments/qr-banking.jpg" alt="VietinBank transfer QR code for NGUYEN PHAN HONG ANH" onError={() => setQrUnavailable(true)} />}
      <p>Bank: VietinBank</p>
      <p>Account holder: NGUYEN PHAN HONG ANH</p>
      <p>Account number: 103880948143</p>
      <p className="commerce-muted">Bank transfer verification is not connected yet. Please do not transfer money for this demo. Placing an order does not confirm payment.</p>
    </div> : <p>{value.delivery === 'pickup' ? 'Pay at store pickup.' : 'Cash on delivery.'}</p>}
  </fieldset>
}
