export type CartProduct = { id: number; name: string; price: number; image: string; stock: number | null }
export type CartLine = CartProduct & { quantity: number }
// Tất cả giá trị tiền được lưu bằng số nguyên đồng Việt Nam.
export const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
export const cartTotal = (items: CartLine[]) => items.reduce((sum, item) => sum + item.price * item.quantity, 0)
export const cartCount = (items: CartLine[]) => items.reduce((sum, item) => sum + item.quantity, 0)
export function addItem(items: CartLine[], product: CartProduct): CartLine[] {
  if (product.stock !== null && product.stock < 1) return items
  const existing = items.find(item => item.id === product.id)
  return existing ? items.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock ?? Infinity) } : item) : [...items, { ...product, quantity: 1 }]
}
export function changeQuantity(items: CartLine[], id: number, quantity: number) {
  if (!Number.isInteger(quantity)) return items
  return items.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(item.stock ?? Infinity, quantity)) } : item)
}
