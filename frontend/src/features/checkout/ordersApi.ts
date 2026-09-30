import { apiRequest } from '../../services/apiClient'
import type { CheckoutForm, OrderReceipt } from './models/checkoutModel'
import { shippingOptions } from './models/checkoutModel'

export type OrderItem = { product_id: number; product_name: string; product_image: string; unit_price: number; quantity: number; line_total: number }
export type Order = { id: number; reference: string; created_at: string; full_name: string; email: string; phone: string; delivery_method: 'ship' | 'pickup'; province_code: string | null; province_name: string | null; ward_code: string | null; ward_name: string | null; street_address: string | null; pickup_name: string | null; pickup_address: string | null; shipping_method: string | null; items: OrderItem[]; subtotal: number; shipping_fee: number; total: number; status: string; payment_method: string; payment_status: string }
export type OrderPage = { items: Array<Pick<Order, 'id' | 'reference' | 'created_at' | 'total' | 'status' | 'delivery_method' | 'payment_method' | 'payment_status'> & { item_count: number }>; total: number; page: number; page_size: number }

export async function createOrder(form: CheckoutForm): Promise<Order> {
  const shipping = shippingOptions.find(option => option.id === form.shipping)
  return apiRequest<Order>('/orders', { method: 'POST', auth: true, body: {
    full_name: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(),
    delivery_method: form.delivery, payment_method: form.payment,
    ...(form.delivery === 'ship' ? { province_code: form.city, ward_code: form.district, street_address: form.address.trim(), shipping_method: shipping?.id } : { pickup_store_id: form.store }),
  } })
}
export const fetchOrders = (page = 1, pageSize = 12, signal?: AbortSignal) => apiRequest<OrderPage>(`/orders?page=${page}&page_size=${pageSize}`, { auth: true, signal })
export const fetchOrder = (id: number, signal?: AbortSignal) => apiRequest<Order>(`/orders/${id}`, { auth: true, signal })
export function toReceipt(order: Order): OrderReceipt {
  return { reference: order.reference, fullName: order.full_name, email: order.email, total: order.total, payment: order.payment_method,
    delivery: order.delivery_method === 'ship' ? `${order.shipping_method} delivery` : order.pickup_name ?? 'Store pickup' }
}
