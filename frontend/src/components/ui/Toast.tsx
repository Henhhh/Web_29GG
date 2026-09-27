import { useEffect } from 'react'
export default function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { if (!message) return; const timer = setTimeout(onClose, 4000); return () => clearTimeout(timer) }, [message, onClose])
  if (!message) return null
  return <div className="shop-toast" role="status"><span>{message}</span><button type="button" onClick={onClose} aria-label="Dismiss notification">×</button></div>
}
