import { categories as fallbackCategories } from './filterModel'
import './Filters.css'

type Props = { value: string; onChange: (value: string) => void; categories?: string[] }

export default function CategoryTabs({ value, onChange, categories = fallbackCategories }: Props) {
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
