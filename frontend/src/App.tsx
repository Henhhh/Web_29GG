import { useCallback, useEffect, useState } from 'react'
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
import { ApiError } from './services/apiClient'
import type { AuthView, LoginCredentials, RegisterCredentials } from './features/auth/authTypes'
import CartDrawer from './features/cart/components/CartDrawer'
import { cartCount, type CartLine } from './features/cart/models/cartModel'
import CheckoutModal from './features/checkout/components/CheckoutModal'
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from './features/cart/cartApi'
import { getToken, subscribeSession } from './services/tokenStore'
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
  useEffect(() => subscribeSession(() => {
    if (!getToken()) {
      setCart([]); setPanel(null); setPendingProduct(null)
      setNotice('Session ended. Please log in again.')
    }
  }), [])
  const dismissNotice = useCallback(() => setNotice(''), [])
  const closeAuth = useCallback(() => { setAuthView(null); setPendingProduct(null) }, [])
  function chooseCategory(value: string) { setCategory(value); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }
  async function addToCart(product: ShopProduct) {
    if (!user) { setPendingProduct(product); setAuthView('login'); return }
    try {
      const result = await addCartItem(product.id)
      setCart(result.items); setNotice(`${product.name} added to cart`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not update your cart.') }
  }
  async function login(credentials: LoginCredentials) {
    setAuthError(''); setAuthDetails({})
    try {
      const next = await signIn(credentials)
      closeAuth()
      try {
        const result = await fetchCart()
        setCart(result.items)
        if (pendingProduct) setCart((await addCartItem(pendingProduct.id)).items)
        setNotice(pendingProduct ? `${pendingProduct.name} added to cart` : `Welcome, ${next.username}!`)
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not load your cart.') }
    } catch (error) { setAuthDetails(error instanceof ApiError ? error.details : {}); setAuthError(error instanceof Error ? error.message : 'Login failed.') }
  }
  async function register(credentials: RegisterCredentials) {
    setAuthError(''); setAuthDetails({})
    try {
      await registerAccount(credentials)
      setAuthView('login')
      setNotice('Account created. Please log in.')
    } catch (error) { setAuthDetails(error instanceof ApiError ? error.details : {}); setAuthError(error instanceof Error ? error.message : 'Registration failed.') }
  }
  function logout() { signOut(); setCart([]); setPanel(null); setNotice('Logged out') }
  async function openCart() {
    setPanel('cart')
    if (!user) return
    try { setCart((await fetchCart()).items) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not load your cart.') }
  }
  async function changeCartQuantity(id: number, quantity: number) {
    try { setCart((await updateCartItem(id, quantity)).items) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not update your cart.') }
  }
  async function deleteCartItem(id: number) {
    try { await removeCartItem(id); setCart(previous => previous.filter(item => item.id !== id)) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not remove this item.') }
  }
  return <div id="top">
    <a className="skip-link" href="#products">Skip to products</a>
    <Header user={user} count={cartCount(cart)} category={category} onCategory={chooseCategory} onAuth={setAuthView} onCart={openCart} onLogout={logout} onProfileSave={updateProfile} />
    <main><HeroSection signedIn={!!user} onRegister={() => setAuthView('register')} /><PromoBanner onShop={chooseCategory} /><ProductSection category={category} onCategory={setCategory} cart={cart} onAdd={addToCart} /><ServiceBenefits /></main>
    <Footer onInfo={setInfo} />
    <AuthModal isOpen={authView !== null} view={authView ?? 'login'} error={authError} details={authDetails} onClose={closeAuth} onViewChange={view => { setAuthError(''); setAuthDetails({}); setAuthView(view) }} onLogin={login} onRegister={register} />
    {panel === 'cart' && <CartDrawer items={cart} onClose={() => setPanel(null)} onRemove={deleteCartItem} onQuantityChange={changeCartQuantity} onCheckout={() => setPanel('checkout')} onAuth={!user ? view => { setPanel(null); setAuthView(view) } : undefined} />}
    {panel === 'checkout' && <CheckoutModal items={cart} user={user} onClose={() => setPanel(null)} onComplete={() => setCart([])} />}
    {info && <Overlay title={info} onClose={() => setInfo(null)}><p className="shop-info">{info} is not available yet. Details will be added before the shop launches.</p></Overlay>}
    <Toast message={notice} onClose={dismissNotice} />
  </div>
}
