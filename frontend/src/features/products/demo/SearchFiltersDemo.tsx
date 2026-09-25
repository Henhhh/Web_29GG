import { useState } from 'react'
import SearchBar from '../components/filters/SearchBar'
import CategoryTabs from '../components/filters/CategoryTabs'
import FilterSidebar from '../components/filters/FilterSidebar'
import { emptyFilters, matchesFilters, type FilterableProduct } from '../components/filters/filterModel'
import './SearchFiltersDemo.css'

// Dữ liệu chỉ dành cho demo; khi ghép shop sẽ dùng danh sách sản phẩm chung.
const baseProducts = [
  { id: 1, name: 'G102 / G203 Lightsync', category: 'Mouse', specs: ['Logitech', '8,000 DPI', 'USB'], price: 39.99 },
  { id: 2, name: 'G Pro X Superlight 2', category: 'Mouse', specs: ['Logitech', '44,000 DPI', '2.4GHz / USB'], price: 159.99 },
  { id: 3, name: 'DeathAdder V3 Pro', category: 'Mouse', specs: ['Razer', '30,000 DPI', '2.4GHz / USB'], price: 149.99 },
  { id: 4, name: 'Keychron Q3 Pro', category: 'Keyboards', specs: ['Keychron', '75%', 'Bluetooth / USB-C'], price: 199.99 },
  { id: 5, name: 'Seiren V3 Chroma', category: 'Microphones', specs: ['Razer', 'Chroma RGB', 'USB-C'], price: 99.99 },
  { id: 6, name: 'HyperX Cloud II Wireless', category: 'Headphones', specs: ['HyperX', '30hr Battery', 'USB Wireless'], price: 149.99 },
]

const demoProducts: (FilterableProduct & { id: number })[] = [
  ...baseProducts.map(product => ({ ...product, brand: product.specs[0],
    connections: product.specs[2].split(' / ').map(value => value === 'USB Wireless' ? '2.4GHz' : value),
    size: product.id === 4 ? '75%' : undefined,
  })),
  { id: 7, name: 'LG UltraGear 27GP850-B', category: 'Monitors', brand: 'LG', connections: ['USB'], size: '27"', refreshRate: '180Hz', specs: ['27" QHD', '180Hz', 'USB'], price: 349.99 },
  { id: 8, name: 'Samsung Odyssey G7', category: 'Monitors', brand: 'Samsung', connections: ['USB'], size: '32"', refreshRate: '240Hz', specs: ['32" QHD', '240Hz', 'USB'], price: 599.99 },
  { id: 9, name: 'Wooting 60HE+', category: 'Keyboards', brand: 'Wooting', connections: ['USB-C'], size: '60%', specs: ['60%', 'Hall Effect', 'USB-C'], price: 174.99 },
  { id: 10, name: 'Logitech G840 XL', category: 'Mouse Pads', brand: 'Logitech', connections: [], specs: ['900 × 400 mm', 'Cloth surface'], price: 49.99 },
]

export default function SearchFiltersDemo() {
  // Component cha giữ state và lọc dữ liệu; SearchBar chỉ nhận và báo thay đổi.
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [filters, setFilters] = useState(emptyFilters)
  const filteredProducts = demoProducts.filter(product => matchesFilters(product, search, category, filters))

  function resetAll() {
    setSearch('')
    setCategory('All')
    setFilters({ ...emptyFilters })
  }

  return (
    <main className="search-demo">
      <p className="search-demo__eyebrow">29GG / SEARCH & FILTER DEMO</p>
      <div className="search-demo__toolbar">
        <h1>GEAR UP</h1>
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <p className="search-demo__hint">Thử nhập “logitech”, “USB-C” hoặc “headphones”. Kết quả cập nhật ngay khi bạn nhập.</p>
      <CategoryTabs value={category} onChange={setCategory} />
      <div className="search-demo__layout">
      <FilterSidebar value={filters} onChange={setFilters} />
      <div className="search-demo__results">
      <p className="search-demo__count" role="status">{filteredProducts.length} / {demoProducts.length} sản phẩm mẫu</p>
      <button className="search-demo__reset" type="button" onClick={resetAll}>Đặt lại tìm kiếm và tất cả bộ lọc</button>
      {filteredProducts.length ? (
        <ul className="search-demo__grid">
          {filteredProducts.map((product) => (
            <li className="search-demo__card" key={product.id}>
              <span className="search-demo__category">{product.category}</span>
              <h2>{product.name}</h2>
              <p>{product.specs.join(' · ')}</p>
              <strong>${product.price.toFixed(2)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="search-demo__empty">Không tìm thấy sản phẩm. Hãy đổi điều kiện hoặc đặt lại tìm kiếm và bộ lọc.</p>
      )}
      </div>
      </div>
    </main>
  )
}
