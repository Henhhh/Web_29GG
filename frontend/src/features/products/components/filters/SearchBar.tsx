import { useRef } from 'react'
import './SearchBar.css'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function clearSearch() {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className="product-search" role="search" aria-label="Product search">
      <svg className="product-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        ref={inputRef}
        className="product-search__input"
        type="search"
        aria-label="Search by product name or specifications"
        placeholder="Search products, specs..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button className="product-search__clear" type="button" aria-label="Clear search" onClick={clearSearch}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  )
}
