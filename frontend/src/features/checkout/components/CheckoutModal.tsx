import { useState, type FormEvent } from 'react'
import Overlay from '../../../components/ui/Overlay'
import { cartCount, money, type CartLine } from '../../cart/models/cartModel'
import { initialCheckout, orderTotal, shippingOptions, stores, validateCheckout, type OrderReceipt } from '../models/checkoutModel'
import ContactForm from './ContactForm'
import DeliveryOptions from './DeliveryOptions'
import PackageInfo from './PackageInfo'
import PaymentForm from './PaymentForm'
import OrderSummary from './OrderSummary'
import OrderSuccess from './OrderSuccess'
import type { AuthUser } from '../../auth/authTypes'
type Props = { items: CartLine[]; onClose: () => void; onComplete: (receipt: OrderReceipt) => void; user?: AuthUser | null }
export default function CheckoutModal({ items, onClose, onComplete, user }: Props) {
  const [form, setForm] = useState(() => ({ ...initialCheckout, fullName: user?.fullName ?? '', email: user?.email ?? '', phone: user?.phone ?? '' }))
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null)
  function submit(event: FormEvent) {
    event.preventDefault()
    if (receipt) return
    const message = validateCheckout(form, items)
    setError(message)
    if (message) return
    // Chụp tổng tiền trước khi component cha xóa giỏ. Không lưu dữ liệu thẻ.
    const result: OrderReceipt = { reference: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, fullName: form.fullName.trim(), email: form.email.trim(), total: orderTotal(items, form), payment: form.payment,
      delivery: form.delivery === 'ship' ? shippingOptions.find(option => option.id === form.shipping)!.label : stores.find(store => store.id === form.store)!.name }
    setReceipt(result)
    setForm(initialCheckout)
    onComplete(result)
  }
  return <Overlay title={receipt ? 'Order confirmed' : 'Checkout'} onClose={onClose}>
    {receipt ? <OrderSuccess receipt={receipt} onClose={onClose} /> : <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
      <ContactForm value={form} onChange={setForm} /><DeliveryOptions value={form} onChange={setForm} /><PackageInfo count={cartCount(items)} /><PaymentForm value={form} onChange={setForm} />
      {error && <p className="checkout-error" role="alert">{error}</p>}
      <button type="submit" className="commerce-button" disabled={!items.length}>Place order · {money(orderTotal(items, form))}</button>
    </form><OrderSummary items={items} form={form} /></div>}
  </Overlay>
}
