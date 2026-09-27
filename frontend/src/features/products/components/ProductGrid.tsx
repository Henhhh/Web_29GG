import type { ShopProduct } from '../models/shopProduct'
import type { CartLine } from '../../cart/models/cartModel'
import ProductCard from './ProductCard'
type Props = { products: ShopProduct[]; cart: CartLine[]; onAdd: (product: ShopProduct) => void; onReset: () => void }
export default function ProductGrid({ products, cart, onAdd, onReset }: Props) {
  if (!products.length) return <div className="products-empty"><h3>No products found</h3><p>Try another search or reset the filters.</p><button type="button" className="shop-button shop-button--outline" onClick={onReset}>Reset all filters</button></div>
  return <div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product} quantity={cart.find(item => item.id === product.id)?.quantity ?? 0} onAdd={onAdd} />)}</div>
}
