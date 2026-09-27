import { money } from '../models/cartModel'
export default function CartSummary({ total, onCheckout }: { total: number; onCheckout: () => void }) {
  return <footer className="cart-summary"><p><span>Total</span><strong>{money(total)}</strong></p><button type="button" className="commerce-button" onClick={onCheckout}>Checkout →</button></footer>
}
