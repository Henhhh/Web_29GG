import { useState } from 'react'
import './home.css'
const slides = [
  { title: 'Upgrade your setup', category: 'Keyboards', text: 'Explore keyboards made for your next game.', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=300&fit=crop' },
  { title: 'Find your next mouse', category: 'Mouse', text: 'Precision, comfort and control at your fingertips.', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=300&fit=crop' },
]
export default function PromoBanner({ onShop }: { onShop: (category: string) => void }) {
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  return <section className="shop-container" aria-label="Featured gear"><div className="shop-promo"><div aria-live="polite"><p className="shop-eyebrow">Featured gear</p><h2>{slide.title}</h2><p>{slide.text}</p><button className="shop-button" type="button" onClick={() => onShop(slide.category)}>Shop {slide.category} →</button></div><img src={slide.image} alt={slide.category} /><div className="shop-promo__controls">{slides.map((item, position) => <button type="button" key={item.category} aria-label={`Show ${item.category}`} aria-pressed={position === index} onClick={() => setIndex(position)}>{position + 1}</button>)}</div></div></section>
}
