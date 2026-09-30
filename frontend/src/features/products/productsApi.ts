import { apiRequest } from '../../services/apiClient'
import type { CartProduct } from '../cart/models/cartModel'
import { priceRanges, type Filters } from './components/filters/filterModel'

export type ApiProduct = {
  id: number
  name: string
  category_id: number
  category: string
  brand_id: number
  brand: string
  price: number
  original_price: number | null
  image: string
  stock: number
  specs: string[]
  connections: string[]
  screen_size: number | null
  refresh_rate: number | null
  badge: string | null
}

export type ApiCategory = { id: number; name: string; slug: string }
export type ProductPage = { items: ApiProduct[]; total: number; page: number; page_size: number }

export function productQuery(search: string, category: string, filters: Filters, page: number, pageSize = 12) {
  const query = new URLSearchParams()
  query.set('page', String(page))
  query.set('page_size', String(pageSize))
  const trimmedSearch = search.trim()
  if (trimmedSearch) query.set('q', trimmedSearch)
  if (category !== 'All') {
    const slug = Object.entries(categoryLabels).find(([, label]) => label === category)?.[0]
    query.set('category', slug ?? category.toLowerCase())
  }

  filters.brands.forEach(brand => query.append('brand', brand))
  filters.connections.forEach(connection => query.append('connection', connection))
  filters.sizes.forEach(size => query.append('screen_size', size.replace(/"/g, '')))
  filters.refreshRates.forEach(rate => query.append('refresh_rate', rate.replace(/Hz$/i, '')))

  const selectedRange = priceRanges.find(range => range.label === filters.priceRange)
  if (selectedRange) {
    query.set('min_price', String(selectedRange.min))
    if (Number.isFinite(selectedRange.max)) query.set('max_price_exclusive', String(selectedRange.max))
  } else {
    if (filters.minPrice !== '') query.set('min_price', filters.minPrice)
    if (filters.maxPrice !== '') query.set('max_price', filters.maxPrice)
  }
  return query
}

export async function fetchProducts(search: string, category: string, filters: Filters, page: number, signal?: AbortSignal) {
  const query = productQuery(search, category, filters, page)
  return apiRequest<ProductPage>(`/products?${query.toString()}`, { signal })
}

export const fetchCategories = (signal?: AbortSignal) => apiRequest<ApiCategory[]>('/categories', { signal })
export const fetchBrands = (signal?: AbortSignal) => apiRequest<Array<{ id: number; name: string }>>('/brands', { signal })

const categoryLabels: Record<string, string> = {
  mouse: 'Mouse', keyboard: 'Keyboards', headphone: 'Headphones',
  monitor: 'Monitors', mic: 'Microphones', mousepad: 'Pads',
}

export type ShopProduct = CartProduct & {
  category: string
  brand: string
  specs: string[]
  originalPrice?: number
  badge?: string
  connections: string[]
  size?: string
  refreshRate?: string
}

export function toShopProduct(product: ApiProduct): ShopProduct {
  return {
    id: product.id,
    name: product.name,
    category: categoryLabels[product.category] ?? product.category,
    brand: product.brand,
    price: product.price,
    originalPrice: product.original_price ?? undefined,
    image: product.image,
    stock: product.stock,
    specs: product.specs,
    connections: product.connections,
    size: product.screen_size === null ? undefined : `${product.screen_size}"`,
    refreshRate: product.refresh_rate === null ? undefined : `${product.refresh_rate}Hz`,
    badge: product.badge ?? undefined,
  }
}
