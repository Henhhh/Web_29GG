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
import { AuthApiError } from './features/auth/authTypes'
import type { AuthView, LoginCredentials, RegisterCredentials } from './features/auth/authTypes'
import CartDrawer from './features/cart/components/CartDrawer'
import { addItem, cartCount, changeQuantity, type CartLine } from './features/cart/models/cartModel'
import CheckoutModal from './features/checkout/components/CheckoutModal'
import './App.css'

export default function App() {
  const { user, signIn, signOut, register: registerAccount, updateProfile } = useAuth()
  const [authDetails, setAuthDetails] = useState<Record<string, string>>({})
  const [authError, setAuthError] = useState('')
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
  async function login(credentials: LoginCredentials) {
    setAuthError(''); setAuthDetails({})
    try {
      const next = await signIn(credentials)
      if (pendingProduct) setCart(previous => addItem(previous, pendingProduct))
      setNotice(pendingProduct ? `${pendingProduct.name} added to cart` : `Welcome, ${next.username}!`)
      closeAuth()
    } catch (error) { setAuthDetails(error instanceof AuthApiError ? error.details : {}); setAuthError(error instanceof Error ? error.message : 'Login failed.') }
  }
  async function register(credentials: RegisterCredentials) {
    setAuthError(''); setAuthDetails({})
    try {
      await registerAccount(credentials)
      setAuthView('login')
      setNotice('Account created. Please log in.')
    } catch (error) { setAuthDetails(error instanceof AuthApiError ? error.details : {}); setAuthError(error instanceof Error ? error.message : 'Registration failed.') }
  }
  function logout() { signOut(); setCart([]); setPanel(null); setNotice('Logged out') }
  return <div id="top">
    <a className="skip-link" href="#products">Skip to products</a>
    <Header user={user} count={cartCount(cart)} category={category} onCategory={chooseCategory} onAuth={setAuthView} onCart={() => setPanel('cart')} onLogout={logout} onProfileSave={updateProfile} />
    <main><HeroSection signedIn={!!user} onRegister={() => setAuthView('register')} /><PromoBanner onShop={chooseCategory} /><ProductSection category={category} onCategory={setCategory} cart={cart} onAdd={addToCart} /><ServiceBenefits /></main>
    <Footer onInfo={setInfo} />
    <AuthModal isOpen={authView !== null} view={authView ?? 'login'} error={authError} details={authDetails} onClose={closeAuth} onViewChange={view => { setAuthError(''); setAuthDetails({}); setAuthView(view) }} onLogin={login} onRegister={register} />
    {panel === 'cart' && <CartDrawer items={cart} onClose={() => setPanel(null)} onRemove={id => setCart(previous => previous.filter(item => item.id !== id))} onQuantityChange={(id, quantity) => setCart(previous => changeQuantity(previous, id, quantity))} onCheckout={() => setPanel('checkout')} onAuth={!user ? view => { setPanel(null); setAuthView(view) } : undefined} />}
    {panel === 'checkout' && <CheckoutModal items={cart} user={user} onClose={() => setPanel(null)} onComplete={() => setCart([])} />}
    {info && <Overlay title={info} onClose={() => setInfo(null)}><p className="shop-info">{info} is not available yet. Details will be added before the shop launches.</p></Overlay>}
    <Toast message={notice} onClose={dismissNotice} />
  </div>
}
