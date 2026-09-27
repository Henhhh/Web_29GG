import Overlay from '../../../components/ui/Overlay'
import { cartCount, cartTotal, type CartLine } from '../models/cartModel'
import CartItem from './CartItem'
import CartSummary from './CartSummary'
import EmptyCart from './EmptyCart'
import type { AuthView } from '../../auth/authTypes'
type Props = { items: CartLine[]; onClose: () => void; onRemove: (id: number) => void; onQuantityChange: (id: number, quantity: number) => void; onCheckout: () => void; onAuth?: (view: AuthView) => void }
export default function CartDrawer({ items, onClose, onRemove, onQuantityChange, onCheckout, onAuth }: Props) {
  return <Overlay drawer title={`Cart (${cartCount(items)})`} onClose={onClose}>
    <div className="cart-content">{items.length ? items.map(item => <CartItem key={item.id} item={item} onRemove={onRemove} onQuantityChange={onQuantityChange} />) : <EmptyCart onContinue={onClose} onAuth={onAuth} />}</div>
    {!!items.length && <CartSummary total={cartTotal(items)} onCheckout={onCheckout} />}
  </Overlay>
}
