import type { OrderReceipt } from '../models/checkoutModel'
import { money } from '../../cart/models/cartModel'
export default function OrderSuccess({ receipt, onClose }: { receipt: OrderReceipt; onClose: () => void }) {
  return <div className="order-success"><span aria-hidden="true">✓</span><h3>Order confirmed</h3><p>Thank you, {receipt.fullName}!</p><p>Your order has been saved. Payment is pending; no charge has been made.</p><dl><dt>Order ref</dt><dd>{receipt.reference}</dd><dt>Email</dt><dd>{receipt.email}</dd><dt>Delivery</dt><dd>{receipt.delivery}</dd><dt>Payment</dt><dd>{receipt.payment === 'banking' ? 'QR BANKING' : receipt.payment.toUpperCase()}</dd><dt>Order total</dt><dd>{money(receipt.total)}</dd></dl><button type="button" className="commerce-button" onClick={onClose}>Back to shop</button></div>
}
