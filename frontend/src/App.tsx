import { useCallback, useState } from 'react'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import ServiceBenefits from './components/layout/ServiceBenefits'
import Toast from './components/ui/Toast'
import Overlay from './components/ui/Overlay'
import HeroSection from './features/home/components/HeroSection'
import PromoBanner from './features/home/components/PromoBanner'
import ProductSection from './features/products/components/ProductSection'
import type { ShopProduct } from './features/products/models/shopProduct'
import AuthModal from './features/auth/components/AuthModal'
import useAuth from './features/auth/useAuth'
import type { AuthView, LoginCredentials, RegisterCredentials } from './features/auth/authTypes'
import CartDrawer from './features/cart/components/CartDrawer'
import { addItem, cartCount, changeQuantity, type CartLine } from './features/cart/models/cartModel'
import CheckoutModal from './features/checkout/components/CheckoutModal'
import './App.css'

export default function App() {
  const { user, signIn, signOut, updateProfile } = useAuth()
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [panel, setPanel] = useState<'cart' | 'checkout' | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [category, setCategory] = useState('All')
  const [pendingProduct, setPendingProduct] = useState<ShopProduct | null>(null)
  const [notice, setNotice] = useState('')
  const [info, setInfo] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(''), [])
  const closeAuth = useCallback(() => { setAuthView(null); setPendingProduct(null) }, [])
  function chooseCategory(value: string) { setCategory(value); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }
  function addToCart(product: ShopProduct) {
    if (!user) { setPendingProduct(product); setAuthView('login'); return }
    setCart(previous => addItem(previous, product)); setNotice(`${product.name} added to cart`)
  }
  function finishAuth(username: string, email: string) {
    signIn({ username, email })
    if (pendingProduct) setCart(previous => addItem(previous, pendingProduct))
    setNotice(pendingProduct ? `${pendingProduct.name} added to cart` : `Welcome, ${username}!`)
    closeAuth()
  }
  function login({ email }: LoginCredentials) { finishAuth(email.split('@')[0], email) }
  function register({ username, email }: RegisterCredentials) { finishAuth(username, email) }
  function logout() { signOut(); setCart([]); setPanel(null); setNotice('Logged out') }
  return <div id="top">
    <a className="skip-link" href="#products">Skip to products</a>
    <Header user={user} count={cartCount(cart)} category={category} onCategory={chooseCategory} onAuth={setAuthView} onCart={() => setPanel('cart')} onLogout={logout} onProfileSave={updateProfile} />
    <main><HeroSection signedIn={!!user} onRegister={() => setAuthView('register')} /><PromoBanner onShop={chooseCategory} /><ProductSection category={category} onCategory={setCategory} cart={cart} onAdd={addToCart} /><ServiceBenefits /></main>
    <Footer onInfo={setInfo} />
    <AuthModal isOpen={authView !== null} view={authView ?? 'login'} onClose={closeAuth} onViewChange={setAuthView} onLogin={login} onRegister={register} />
    {panel === 'cart' && <CartDrawer items={cart} onClose={() => setPanel(null)} onRemove={id => setCart(previous => previous.filter(item => item.id !== id))} onQuantityChange={(id, quantity) => setCart(previous => changeQuantity(previous, id, quantity))} onCheckout={() => setPanel('checkout')} onAuth={!user ? view => { setPanel(null); setAuthView(view) } : undefined} />}
    {panel === 'checkout' && <CheckoutModal items={cart} user={user} onClose={() => setPanel(null)} onComplete={() => setCart([])} />}
    {info && <Overlay title={info} onClose={() => setInfo(null)}><p className="shop-info">{info} is not available yet. Details will be added before the shop launches.</p></Overlay>}
    <Toast message={notice} onClose={dismissNotice} />
  </div>
}
