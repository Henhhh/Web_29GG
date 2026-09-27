import type { AuthUser, AuthView, AccountProfile } from '../../features/auth/authTypes'
import AccountMenu from '../../features/auth/components/AccountMenu'
import { categories } from '../../features/products/components/filters/filterModel'
import './layout.css'
type Props = { user: AuthUser | null; count: number; category: string; onCategory: (category: string) => void; onAuth: (view: AuthView) => void; onCart: () => void; onLogout: () => void; onProfileSave: (profile: AccountProfile) => void }
export default function Header({ user, count, category, onCategory, onAuth, onCart, onLogout, onProfileSave }: Props) {
  return <header className="shop-header"><div className="shop-container shop-header__inner">
    <a className="shop-logo" href="#top" aria-label="29GG home"><span className="shop-logo__mark">29</span><b>29<span>GG</span></b></a>
    <nav className="shop-nav" aria-label="Product categories">{categories.slice(1).map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => onCategory(item)}>{item}</button>)}</nav>
    <div className="shop-header__actions"><button className="shop-cart-trigger" type="button" onClick={onCart} aria-label={`Open cart, ${count} items`}>🛒{count > 0 && <span>{count}</span>}</button>
      {user ? <AccountMenu user={user} onLogout={onLogout} onProfileSave={onProfileSave} /> : <><button className="shop-button shop-button--outline" type="button" onClick={() => onAuth('login')}>Login</button><button className="shop-button" type="button" onClick={() => onAuth('register')}>Register</button></>}
    </div></div></header>
}
