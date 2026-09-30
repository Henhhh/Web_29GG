import { useEffect, useState, type FormEvent } from 'react'
import Overlay from '../../../components/ui/Overlay'
import { cartCount, money, type CartLine } from '../../cart/models/cartModel'
import { initialCheckout, orderTotal, validateCheckout, type OrderReceipt } from '../models/checkoutModel'
import ContactForm from './ContactForm'
import DeliveryOptions from './DeliveryOptions'
import PackageInfo from './PackageInfo'
import PaymentForm from './PaymentForm'
import OrderSummary from './OrderSummary'
import OrderSuccess from './OrderSuccess'
import type { AuthUser } from '../../auth/authTypes'
import { fetchPickupStores, type PickupStore } from '../../cart/cartApi'
import { createOrder, toReceipt } from '../ordersApi'
type Props = { items: CartLine[]; onClose: () => void; onComplete: (receipt: OrderReceipt) => void; user?: AuthUser | null }
export default function CheckoutModal({ items, onClose, onComplete, user }: Props) {
  const [form, setForm] = useState(() => ({ ...initialCheckout, fullName: user?.fullName ?? '', email: user?.email ?? '', phone: user?.phone ?? '' }))
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null)
  const [stores, setStores] = useState<PickupStore[]>([])
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetchPickupStores(controller.signal).then(next => {
      if (controller.signal.aborted) return
      setStores(next)
      setForm(current => ({ ...current, store: next.some(store => store.id === current.store) ? current.store : (next[0]?.id ?? '') }))
    }).catch(requestError => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'Could not load pickup stores.') })
    return () => controller.abort()
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (receipt || submitting) return
    const message = form.delivery === 'pickup' && !stores.some(store => store.id === form.store)
      ? 'Pickup stores are unavailable. Please try again.' : validateCheckout(form, items)
    setError(message)
    if (message) return
    setSubmitting(true)
    try {
      const order = await createOrder(form)
      const result = toReceipt(order)
      setReceipt(result)
      setForm(initialCheckout)
      onComplete(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not place this order.')
    } finally { setSubmitting(false) }
  }
  return <Overlay title={receipt ? 'Order confirmed' : 'Checkout'} onClose={onClose}>
    {receipt ? <OrderSuccess receipt={receipt} onClose={onClose} /> : <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
      <ContactForm value={form} onChange={setForm} /><DeliveryOptions value={form} onChange={setForm} stores={stores} /><PackageInfo count={cartCount(items)} /><PaymentForm value={form} onChange={setForm} />
      {error && <p className="checkout-error" role="alert">{error}</p>}
      <button type="submit" className="commerce-button" disabled={!items.length || submitting}>{submitting ? 'Placing order…' : `Place order · ${money(orderTotal(items, form))}`}</button>
    </form><OrderSummary items={items} form={form} stores={stores} /></div>}
  </Overlay>
}
