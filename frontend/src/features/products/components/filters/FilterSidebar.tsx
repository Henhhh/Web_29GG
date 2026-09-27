import { useId, useState } from 'react'
import FilterGroup from './FilterGroup'
import PriceFilter from './PriceFilter'
import { emptyFilters, type Filters } from './filterModel'
import './Filters.css'

const groups = [
  { key: 'brands', title: 'Brand', options: ['Logitech', 'Razer', 'SteelSeries', 'ASUS ROG', 'HyperX', 'Elgato', 'Samsung', 'LG', 'AOC', 'Alienware', 'Wooting', 'Ducky', 'Keychron'] },
  { key: 'connections', title: 'Connection', options: ['Có dây', 'USB', 'USB-C', '2.4GHz', 'Bluetooth', 'XLR'] },
  { key: 'sizes', title: 'Screen size', options: ['23.8"', '25"', '27"', '45"'] },
  { key: 'refreshRates', title: 'Refresh rate', options: ['144Hz', '180Hz', '220Hz', '240Hz', '320Hz', '330Hz', '360Hz'] },
] as const

type Props = { value: Filters; onChange: (value: Filters) => void; brands?: string[] }

export default function FilterSidebar({ value, onChange, brands }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelId = useId()
  const hasFilters = Object.values(value).some(item => item.length > 0)
  return (
    <aside className="filter-sidebar" aria-label="Product filters">
      <button className="filter-sidebar__toggle" type="button" aria-expanded={mobileOpen} aria-controls={panelId} onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? 'Hide filters' : 'Show filters'}{hasFilters ? ' •' : ''}
      </button>
      <div id={panelId} className={`filter-sidebar__panel${mobileOpen ? ' filter-sidebar__panel--open' : ''}`}>
        <div className="filter-sidebar__heading">
          <h2>⚙ Search filters</h2>
          {hasFilters && <button type="button" onClick={() => onChange({ ...emptyFilters })}>Clear all</button>}
        </div>
        <PriceFilter value={value} onChange={onChange} />
        {groups.map(group => (
          <FilterGroup key={group.key} title={group.title} defaultOpen={group.key === 'brands' || group.key === 'connections'}>
            {group.key === 'brands' && brands?.length === 0 && <p className="price-filter__hint">No brand data available.</p>}
            {(group.key === 'brands' && brands ? brands : group.options).map(option => (
              <label className="filter-option" key={option}>
                <input type="checkbox" checked={value[group.key].includes(option)} onChange={event => onChange({ ...value,
                  [group.key]: event.target.checked ? [...value[group.key], option] : value[group.key].filter(item => item !== option),
                })} />
                {option === 'Có dây' ? 'Wired' : option}
              </label>
            ))}
          </FilterGroup>
        ))}
      </div>
    </aside>
  )
}
