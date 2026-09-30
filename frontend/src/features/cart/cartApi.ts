import { apiRequest } from '../../services/apiClient'
import type { CartLine } from './models/cartModel'

type ApiCart = { items: Array<{ product_id: number; name: string; image: string; unit_price: number; quantity: number; stock: number }>; subtotal: number }
export type PickupStore = { id: string; name: string; address: string }
export type CartResponse = { items: CartLine[]; subtotal: number }

function normalize(cart: ApiCart): CartResponse {
  return { items: cart.items.map(item => ({ id: item.product_id, name: item.name, image: item.image, price: item.unit_price, quantity: item.quantity, stock: item.stock })), subtotal: cart.subtotal }
}
export async function fetchCart() { return normalize(await apiRequest<ApiCart>('/cart', { auth: true })) }
export async function addCartItem(productId: number, quantity = 1) { return normalize(await apiRequest<ApiCart>('/cart/items', { method: 'POST', body: { product_id: productId, quantity }, auth: true })) }
export async function updateCartItem(productId: number, quantity: number) { return normalize(await apiRequest<ApiCart>(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity }, auth: true })) }
export async function removeCartItem(productId: number) { await apiRequest<void>(`/cart/items/${productId}`, { method: 'DELETE', auth: true }) }
export async function fetchPickupStores(signal?: AbortSignal) { return apiRequest<PickupStore[]>('/pickup-stores', { signal }) }
