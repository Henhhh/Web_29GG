import { useState } from 'react'
import SearchBar from './filters/SearchBar'
import CategoryTabs from './filters/CategoryTabs'
import FilterSidebar from './filters/FilterSidebar'
import { emptyFilters, matchesFilters } from './filters/filterModel'
import { shopProducts, type ShopProduct } from '../models/shopProduct'
import type { CartLine } from '../../cart/models/cartModel'
import ProductGrid from './ProductGrid'
import './products.css'
type Props = { category: string; onCategory: (value: string) => void; cart: CartLine[]; onAdd: (product: ShopProduct) => void }
export default function ProductSection({ category, onCategory, cart, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const products = shopProducts.filter(product => matchesFilters(product, search, category, filters))
  function reset() { setSearch(''); setFilters({ ...emptyFilters }); onCategory('All') }
  return <section id="products" className="shop-container products-section" aria-labelledby="products-title"><div className="products-heading"><div><p className="shop-eyebrow">Arsenal</p><h2 id="products-title">Gear up</h2></div><SearchBar value={search} onChange={setSearch} /></div><CategoryTabs value={category} onChange={onCategory} /><div className="products-layout"><FilterSidebar value={filters} onChange={setFilters} brands={[...new Set(shopProducts.map(product => product.brand).filter(Boolean))]} /><div className="products-results"><p className="products-count" role="status">{products.length} products</p><ProductGrid products={products} cart={cart} onAdd={onAdd} onReset={reset} /></div></div></section>
}
