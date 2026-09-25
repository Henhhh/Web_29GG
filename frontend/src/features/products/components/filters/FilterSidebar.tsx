import { useId, useState } from 'react'
import FilterGroup from './FilterGroup'
import PriceFilter from './PriceFilter'
import { emptyFilters, type Filters } from './filterModel'
import './Filters.css'

const groups = [
  { key: 'brands', title: 'Brand', options: ['Logitech', 'Razer', 'SteelSeries', 'ASUS ROG', 'HyperX', 'Elgato', 'Samsung', 'LG', 'AOC', 'Alienware', 'Wooting', 'Ducky', 'Keychron'] },
  { key: 'connections', title: 'Connection', options: ['USB', 'USB-C', '2.4GHz', 'Bluetooth'] },
  { key: 'sizes', title: 'Layout / Size', options: ['60%', '75%', 'TKL', '96%', 'Full-size', '25"', '27"', '32"', '34"'] },
  { key: 'refreshRates', title: 'Refresh rate', options: ['165Hz', '180Hz', '240Hz', '300Hz'] },
] as const

type Props = { value: Filters; onChange: (value: Filters) => void }

export default function FilterSidebar({ value, onChange }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelId = useId()
  const hasFilters = Object.values(value).some(item => item.length > 0)
  return (
    <aside className="filter-sidebar" aria-label="Bộ lọc sản phẩm">
      <button className="filter-sidebar__toggle" type="button" aria-expanded={mobileOpen} aria-controls={panelId} onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}{hasFilters ? ' •' : ''}
      </button>
      <div id={panelId} className={`filter-sidebar__panel${mobileOpen ? ' filter-sidebar__panel--open' : ''}`}>
        <div className="filter-sidebar__heading">
          <h2>⚙ Search filters</h2>
          {hasFilters && <button type="button" onClick={() => onChange({ ...emptyFilters })}>Clear all</button>}
        </div>
        <PriceFilter value={value} onChange={onChange} />
        {groups.map(group => (
          <FilterGroup key={group.key} title={group.title} defaultOpen={group.key === 'brands' || group.key === 'connections'}>
            {group.options.map(option => (
              <label className="filter-option" key={option}>
                <input type="checkbox" checked={value[group.key].includes(option)} onChange={event => onChange({ ...value,
                  [group.key]: event.target.checked ? [...value[group.key], option] : value[group.key].filter(item => item !== option),
                })} />
                {option}
              </label>
            ))}
          </FilterGroup>
        ))}
      </div>
    </aside>
  )
}
