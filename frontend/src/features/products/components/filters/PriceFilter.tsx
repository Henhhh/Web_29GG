import { useId } from 'react'
import FilterGroup from './FilterGroup'
import { priceError, priceRanges, type Filters } from './filterModel'

type Props = { value: Filters; onChange: (value: Filters) => void }

export default function PriceFilter({ value, onChange }: Props) {
  const id = useId()
  const error = priceError(value)
  return (
    <FilterGroup title="Price range">
      <div role="radiogroup" aria-label="Khoảng giá">
        <label className="filter-option">
          <input type="radio" name={id} checked={!value.priceRange} onChange={() => onChange({ ...value, priceRange: '', minPrice: '', maxPrice: '' })} />
          Mọi mức giá / Tự nhập
        </label>
        {priceRanges.map(range => (
          <label className="filter-option" key={range.label}>
            <input type="radio" name={id} checked={value.priceRange === range.label} onChange={() => onChange({ ...value, priceRange: range.label, minPrice: '', maxPrice: '' })} />
            {range.label}
          </label>
        ))}
      </div>
      <p className="price-filter__hint">Or enter custom range (USD):</p>
      <div className="price-filter__inputs">
        {(['minPrice', 'maxPrice'] as const).map((key, index) => (
          <input key={key} type="number" min="0" step="0.01" placeholder={index === 0 ? 'Min' : 'Max'} aria-label={index === 0 ? 'Giá thấp nhất (USD)' : 'Giá cao nhất (USD)'}
            value={value[key]} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
            onChange={event => onChange({ ...value, priceRange: '', [key]: event.target.value })} />
        ))}
      </div>
      {error && <p className="price-filter__error" id={`${id}-error`} role="alert">{error}</p>}
    </FilterGroup>
  )
}
