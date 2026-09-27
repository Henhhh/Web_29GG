import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './commerce.css'

type Props = { title: string; onClose: () => void; children: ReactNode; drawer?: boolean }
export default function Overlay({ title, onClose, children, drawer = false }: Props) {
  const panel = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  const titleId = useId()
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close.current()
      if (event.key !== 'Tab') return
      const targets = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0)
      const first = targets[0], last = targets[targets.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])
  return createPortal(
    <div className={`commerce-overlay${drawer ? ' commerce-overlay--drawer' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`commerce-panel${drawer ? ' commerce-panel--drawer' : ''}`}>
        <header className="commerce-heading"><h2 id={titleId}>{title}</h2><button type="button" className="commerce-close" aria-label="Close" onClick={onClose}>×</button></header>
        {children}
      </section>
    </div>, document.body,
  )
}
