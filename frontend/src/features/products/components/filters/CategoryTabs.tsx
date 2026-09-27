import { categories } from './filterModel'
import './Filters.css'

type Props = { value: string; onChange: (value: string) => void }

export default function CategoryTabs({ value, onChange }: Props) {
  return (
    <div className="category-tabs" role="group" aria-label="Product categories">
      {categories.map(category => (
        <button key={category} type="button" aria-pressed={value === category} onClick={() => onChange(category)}>
          {category}
        </button>
      ))}
    </div>
  )
}
