import './layout.css'
const benefits = [
  { icon: '⚡', title: 'Free Shipping', text: 'Free standard delivery. Express options at checkout.' },
  { icon: '🔒', title: 'Secure Checkout', text: 'Payment preview — no real transactions yet.' },
  { icon: '↩', title: '30-Day Returns', text: 'Return policy details will be available at launch.' },
]
export default function ServiceBenefits() {
  return <section className="shop-benefits" aria-label="Shopping services"><div className="shop-container">{benefits.map(benefit => <article key={benefit.title}><span aria-hidden="true">{benefit.icon}</span><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></article>)}</div></section>
}
