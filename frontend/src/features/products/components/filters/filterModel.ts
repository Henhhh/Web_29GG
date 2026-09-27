export const categories = ['All', 'Mouse', 'Keyboards', 'Headphones', 'Monitors', 'Microphones', 'Pads']
export const priceRanges = [
  { label: 'Under 500.000 ₫', min: 0, max: 500000 },
  { label: '500.000 – under 1.000.000 ₫', min: 500000, max: 1000000 },
  { label: '1.000.000 – under 2.000.000 ₫', min: 1000000, max: 2000000 },
  { label: '2.000.000 – under 5.000.000 ₫', min: 2000000, max: 5000000 },
  { label: '5.000.000 – under 10.000.000 ₫', min: 5000000, max: 10000000 },
  { label: '10.000.000 ₫ and above', min: 10000000, max: Infinity },
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
    return 'Price must be a non-negative number.'
  }
  if (minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice)) {
    return 'Minimum price must not exceed maximum price.'
  }
  return ''
}

// OR trong cùng nhóm, AND giữa các nhóm. Price range: min <= giá < max.
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
