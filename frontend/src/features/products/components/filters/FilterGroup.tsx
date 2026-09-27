import { useId, useState, type ReactNode } from 'react'
import './Filters.css'

type Props = { title: string; children: ReactNode; defaultOpen?: boolean }

export default function FilterGroup({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()
  return (
    <section className="filter-group">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(!open)}>
          {title}<span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
      </h3>
      <div id={contentId} hidden={!open} className="filter-group__content">{children}</div>
    </section>
  )
}
