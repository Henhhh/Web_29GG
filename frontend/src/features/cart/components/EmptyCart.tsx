import type { AuthView } from '../../auth/authTypes'
export default function EmptyCart({ onContinue, onAuth }: { onContinue: () => void; onAuth?: (view: AuthView) => void }) {
  return <div className="cart-empty"><span aria-hidden="true">🛒</span><p>Your cart is empty</p>{onAuth ? <div className="shop-header__actions"><button className="shop-button shop-button--outline" type="button" onClick={() => onAuth('login')}>Login</button><button className="shop-button" type="button" onClick={() => onAuth('register')}>Register</button></div> : <button className="commerce-button" type="button" onClick={onContinue}>Continue shopping</button>}</div>
}
