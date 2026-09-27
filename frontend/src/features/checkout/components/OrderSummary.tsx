import { cartTotal, money, type CartLine } from '../../cart/models/cartModel'
import { orderTotal, shippingCost, shippingOptions, stores, type CheckoutForm } from '../models/checkoutModel'
export default function OrderSummary({ items, form }: { items: CartLine[]; form: CheckoutForm }) {
  return <aside className="order-summary"><h3>Order summary</h3><div className="order-summary__items">{items.map(item => <div className="order-summary__item" key={item.id}><img src={item.image} alt={item.name} /><div><b>{item.name}</b><small>Qty: {item.quantity}</small></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div>
    <div className="order-summary__totals"><p>{form.delivery === 'ship' ? shippingOptions.find(option => option.id === form.shipping)?.label : stores.find(store => store.id === form.store)?.name}</p><p><span>Subtotal</span><span>{money(cartTotal(items))}</span></p><p><span>Shipping</span><span>{shippingCost(form) ? money(shippingCost(form)) : 'FREE'}</span></p><p><b>Total</b><strong>{money(orderTotal(items, form))}</strong></p></div>
  </aside>
}
