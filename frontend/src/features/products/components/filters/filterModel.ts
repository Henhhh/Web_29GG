export const categories = ['All', 'Mouse', 'Keyboards', 'Headphones', 'Monitors', 'Microphones', 'Mouse Pads']
export const priceRanges = [
  { label: '$0 – $50', min: 0, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
  { label: '$100 – $200', min: 100, max: 200 },
  { label: '$200 – $500', min: 200, max: 500 },
  { label: '$500+', min: 500, max: Infinity },
]

export type Filters = {
  priceRange: string
  minPrice: string
  maxPrice: string
  brands: string[]
  connections: string[]
  sizes: string[]
  refreshRates: string[]
}

export const emptyFilters: Filters = {
  priceRange: '', minPrice: '', maxPrice: '', brands: [], connections: [], sizes: [], refreshRates: [],
}

export type FilterableProduct = {
  name: string
  category: string
  specs: string[]
  price: number
  brand: string
  connections: string[]
  size?: string
  refreshRate?: string
}

export function priceError(filters: Filters) {
  const { minPrice, maxPrice } = filters
  if ([minPrice, maxPrice].some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
    return 'Giá phải là số không âm.'
  }
  if (minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice)) {
    return 'Giá thấp nhất không được lớn hơn giá cao nhất.'
  }
  return ''
}

// OR trong cùng nhóm, AND giữa các nhóm. Khoảng giá: min <= giá < max.
// Giá tự nhập bao gồm cả hai đầu mút.
export function matchesFilters(product: FilterableProduct, search: string, category: string, filters: Filters) {
  if (priceError(filters)) return false
  const query = search.trim().toLowerCase()
  const range = priceRanges.find(item => item.label === filters.priceRange)
  return [product.name, product.category, product.brand, ...product.specs].join(' ').toLowerCase().includes(query)
    && (category === 'All' || product.category === category)
    && (!range || (product.price >= range.min && product.price < range.max))
    && (filters.minPrice === '' || product.price >= Number(filters.minPrice))
    && (filters.maxPrice === '' || product.price <= Number(filters.maxPrice))
    && (!filters.brands.length || filters.brands.includes(product.brand))
    && (!filters.connections.length || filters.connections.some(value => product.connections.includes(value)))
    && (!filters.sizes.length || filters.sizes.includes(product.size ?? ''))
    && (!filters.refreshRates.length || filters.refreshRates.includes(product.refreshRate ?? ''))
}
