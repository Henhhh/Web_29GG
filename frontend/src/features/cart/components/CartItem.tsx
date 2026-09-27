import { money, type CartLine } from '../models/cartModel'
type Props = { item: CartLine; onRemove: (id: number) => void; onQuantityChange: (id: number, quantity: number) => void }
export default function CartItem({ item, onRemove, onQuantityChange }: Props) {
  return <article className="cart-line">
    <img src={item.image} alt={item.name} />
    <div className="cart-line__info"><h3>{item.name}</h3><div className="cart-quantity" role="group" aria-label={`Quantity of ${item.name}`}>
      <button type="button" disabled={item.quantity <= 1} aria-label={`Decrease quantity of ${item.name}`} onClick={() => onQuantityChange(item.id, item.quantity - 1)}>−</button>
      <span>Qty: {item.quantity}</span>
      <button type="button" disabled={item.stock !== null && item.quantity >= item.stock} aria-label={`Increase quantity of ${item.name}`} onClick={() => onQuantityChange(item.id, item.quantity + 1)}>+</button>
    </div><strong>{money(item.price * item.quantity)}</strong></div>
    <button type="button" className="commerce-close" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}>×</button>
  </article>
}
