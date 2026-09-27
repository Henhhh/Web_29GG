import { INVENTORY, type Product } from '../data/productCatalog'
import type { FilterableProduct } from '../components/filters/filterModel'
export const categoryLabels: Record<string, string> = { mouse: 'Mouse', keyboard: 'Keyboards', headphone: 'Headphones', monitor: 'Monitors', mic: 'Microphones', mousepad: 'Pads' }
export type ShopProduct = Product & FilterableProduct
// Thông số và hãng đã được chuẩn hóa khi nhập Excel.
export function toShopProduct(product: Product): ShopProduct {
  return { ...product, category: categoryLabels[product.category] ?? product.category }
}
export const shopProducts = INVENTORY.map(toShopProduct)
