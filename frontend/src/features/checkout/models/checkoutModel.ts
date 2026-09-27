import { cartTotal, type CartLine } from '../../cart/models/cartModel'
import { provinces } from '../data/vietnamDivisions'
export const shippingOptions = [
  { id: 'standard', label: 'Standard Delivery', eta: '5–7 business days', price: 0 },
  { id: 'express', label: 'Express Delivery', eta: '2–3 business days', price: 249750 },
  { id: 'overnight', label: 'Overnight Delivery', eta: 'Next business day', price: 624750 },
] as const
export const stores = [
  { id: 'yen-lang', name: '29GG — Yên Lãng', address: '120 Yên Lãng, phường Đống Đa, Hà Nội' },
  { id: 'kim-ma', name: '29GG — Kim Mã', address: '300 Kim Mã, phường Giảng Võ, Hà Nội' },
  { id: 'nguyen-thai-hoc', name: '29GG — Nguyễn Thái Học', address: '155 Nguyễn Thái Học, phường Tam Thắng, Hồ Chí Minh City' },
  { id: 'hoang-van-thu', name: '29GG — Hoàng Văn Thụ', address: '318 Hoàng Văn Thụ, phường Tân Sơn Nhất, Hồ Chí Minh City' },
]
export type CheckoutForm = {
  fullName: string; email: string; phone: string; address: string;
  // city và district lưu mã tỉnh/thành, phường/xã (không phải quận/huyện cũ).
  city: string; district: string;
  delivery: 'ship' | 'pickup'; shipping: string; store: string; payment: 'card' | 'banking' | 'cash';
  cardName: string; cardNumber: string; expiry: string; cvv: string;
}
export const initialCheckout: CheckoutForm = {
  fullName: '', email: '', phone: '', address: '', city: '', district: '', delivery: 'ship', shipping: 'standard', store: stores[0].id, payment: 'card', cardName: '', cardNumber: '', expiry: '', cvv: '',
}
export type FormProps = { value: CheckoutForm; onChange: (value: CheckoutForm) => void }
export type OrderReceipt = { reference: string; fullName: string; email: string; total: number; delivery: string; payment: string }
export const shippingCost = (form: CheckoutForm) => form.delivery === 'pickup' ? 0 : (shippingOptions.find(option => option.id === form.shipping)?.price ?? 0)
export const orderTotal = (items: CartLine[], form: CheckoutForm) => cartTotal(items) + shippingCost(form)
export function validateCheckout(form: CheckoutForm, items: CartLine[]) {
  if (!items.length) return 'Your cart is empty.'
  if (items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || (item.stock !== null && item.quantity > item.stock))) return 'Invalid product quantity.'
  if (!form.fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !/^[+\d\s()-]{7,20}$/.test(form.phone.trim())) return 'Please enter a valid full name, email and phone number.'
  if (!['ship', 'pickup'].includes(form.delivery)) return 'Invalid delivery method.'
  if (form.delivery === 'ship') {
    const province = provinces.find(item => item.code === form.city)
    if (!form.address.trim() || !province?.wards.some(ward => ward.code === form.district)) return 'Please enter your street address and select a ward in the selected province or city.'
    if (!shippingOptions.some(option => option.id === form.shipping)) return 'Please select a valid shipping option.'
  }
  if (form.delivery === 'pickup' && !stores.some(store => store.id === form.store)) return 'Please select a pickup store.'
  if (!['card', 'banking', 'cash'].includes(form.payment)) return 'Invalid payment method.'
  if (form.payment === 'card') {
    if (!form.cardName.trim() || !/^\d{16}$/.test(form.cardNumber.replace(/\s/g, '')) || !/^\d{3,4}$/.test(form.cvv)) return 'Enter the cardholder name, a 16-digit test card number and a 3–4 digit CVV.'
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(form.expiry)
    if (!match || new Date(2000 + Number(match[2]), Number(match[1]), 1) <= new Date()) return 'Enter a future expiry date in MM/YY format.'
  }
  return ''
}
