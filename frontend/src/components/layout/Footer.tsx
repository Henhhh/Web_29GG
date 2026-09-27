import './layout.css'
export default function Footer({ onInfo }: { onInfo: (title: string) => void }) {
  return <footer className="shop-footer"><div className="shop-container shop-footer__inner"><div><a className="shop-logo" href="#top">29<span>GG</span></a><p>© 2026 29GG. All rights reserved.</p></div><nav aria-label="Information">{['Privacy Policy', 'Terms of Service', 'Contact Us', 'FAQ'].map(title => <button type="button" key={title} onClick={() => onInfo(title)}>{title}</button>)}</nav></div></footer>
}
