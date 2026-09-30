import { useEffect, useMemo, useState } from 'react'
import SearchBar from './filters/SearchBar'
import CategoryTabs from './filters/CategoryTabs'
import FilterSidebar from './filters/FilterSidebar'
import { emptyFilters, priceError, type Filters } from './filters/filterModel'
import type { CartLine } from '../../cart/models/cartModel'
import ProductGrid from './ProductGrid'
import { fetchBrands, fetchCategories, fetchProducts, toShopProduct, type ShopProduct } from '../productsApi'
import './products.css'

type Props = { category: string; onCategory: (value: string) => void; cart: CartLine[]; onAdd: (product: ShopProduct) => void }
const PAGE_SIZE = 12

export default function ProductSection({ category, onCategory, cart, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters })
  const [pagination, setPagination] = useState({ category, page: 1 })
  const page = pagination.category === category ? pagination.page : 1
  const [items, setItems] = useState<ShopProduct[]>([])
  const [total, setTotal] = useState(0)
  const [brands, setBrands] = useState<string[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const localPriceError = priceError(filters)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pages = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages])

  function setPage(next: number | ((current: number) => number)) {
    setPagination(current => {
      const currentPage = current.category === category ? current.page : 1
      return { category, page: typeof next === 'function' ? next(currentPage) : next }
    })
  }

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetchBrands(controller.signal), fetchCategories(controller.signal)])
      .then(([nextBrands, nextCategories]) => {
        if (controller.signal.aborted) return
        setBrands(nextBrands.map(brand => brand.name))
        setCategoryNames(nextCategories.map(item => item.name))
      })
      .catch(() => {
        // Product results remain usable if optional filter metadata is unavailable.
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (localPriceError) return () => controller.abort()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      fetchProducts(search, category, filters, page, controller.signal)
        .then(result => {
          if (controller.signal.aborted) return
          setItems(result.items.map(toShopProduct))
          setTotal(result.total)
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return
          setItems([])
          setTotal(0)
          setError(requestError instanceof Error ? requestError.message : 'Could not load products.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, search.trim() ? 250 : 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [search, category, filters, page, localPriceError, reload])

  function reset() {
    setSearch('')
    setFilters({ ...emptyFilters })
    setPage(1)
    onCategory('All')
  }

  function changeFilters(value: Filters) {
    setFilters(value)
    setPage(1)
  }

  function changeCategory(value: string) {
    onCategory(value)
    setPage(1)
  }

  const visibleCategories = categoryNames.length ? ['All', ...categoryNames] : undefined

  return <section id="products" className="shop-container products-section" aria-labelledby="products-title" aria-busy={loading && !localPriceError}>
    <div className="products-heading">
      <div><p className="shop-eyebrow">Arsenal</p><h2 id="products-title">Gear up</h2></div>
      <SearchBar value={search} onChange={value => { setSearch(value); setPage(1) }} />
    </div>
    <CategoryTabs value={category} onChange={changeCategory} categories={visibleCategories} />
    <div className="products-layout">
      <FilterSidebar value={filters} onChange={changeFilters} brands={brands} />
      <div className="products-results">
        <p className="products-count" role="status">{localPriceError ? 'Adjust the price filters' : loading ? 'Loading products…' : `${total} products`}</p>
        {localPriceError && <p className="products-error" role="alert">{localPriceError}</p>}
        {error && <div className="products-error" role="alert"><p>{error}</p><button type="button" className="shop-button shop-button--outline" onClick={() => setReload(value => value + 1)}>Retry</button></div>}
        {!error && !loading && !localPriceError && <ProductGrid products={items} cart={cart} onAdd={onAdd} onReset={reset} />}
        {!error && !loading && !localPriceError && totalPages > 1 && <nav className="products-pagination" aria-label="Product pages">
          <button type="button" className="shop-button shop-button--outline" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
          {pages.map(number => <button key={number} type="button" className={`shop-button shop-button--outline${number === page ? ' products-pagination__current' : ''}`} aria-current={number === page ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}
          <button type="button" className="shop-button shop-button--outline" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>Next</button>
        </nav>}
      </div>
    </div>
  </section>
}
