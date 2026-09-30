import { useEffect, useState } from 'react'
import Overlay from '../../components/ui/Overlay'
import { money } from '../cart/models/cartModel'
import { fetchOrder, fetchOrders, type Order, type OrderPage } from '../checkout/ordersApi'
import './orders.css'

const labels: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', card: 'Card', banking: 'QR Banking', cash: 'Cash',
  standard: 'Standard delivery', express: 'Express delivery', overnight: 'Overnight delivery',
}
const label = (value: string) => labels[value] ?? value
const date = (value: string) => new Date(value).toLocaleString('en-GB')

export default function OrderHistory({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [result, setResult] = useState<OrderPage | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const request = selectedId === null
      ? fetchOrders(page, 6, controller.signal).then(data => {
        if (!controller.signal.aborted) setResult(data)
      })
      : fetchOrder(selectedId, controller.signal).then(data => {
        if (!controller.signal.aborted) setOrder(data)
      })
    request.catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load orders.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [page, selectedId, reload])

  function navigate(id: number | null, nextPage = page) {
    setLoading(true)
    setError('')
    setOrder(null)
    setSelectedId(id)
    setPage(nextPage)
  }

  return <Overlay title={selectedId === null ? 'My Orders' : 'Order details'} onClose={onClose}>
    <div className="order-history" aria-busy={loading}>
      {selectedId !== null && <button type="button" className="shop-button shop-button--outline" onClick={() => navigate(null)}>Back to orders</button>}
      {loading && <p role="status">Loading orders…</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" className="shop-button" onClick={() => { setLoading(true); setError(''); setReload(value => value + 1) }}>Retry</button></div>}
      {!loading && !error && selectedId === null && result && <>
        {result.total === 0 ? <p>You have no orders yet. Your purchases will appear here after checkout.</p> : <>
          <p>{result.total} orders · Newest first</p>
          <ul className="order-history__list">{result.items.map(item => <li key={item.id} className="order-history__card">
            <div><strong>{item.reference}</strong><p><time dateTime={item.created_at}>{date(item.created_at)}</time></p></div>
            <p>{item.item_count} items · {item.delivery_method === 'ship' ? 'Home delivery' : 'Store pickup'}</p>
            <p>Order: {label(item.status)} · Payment: {label(item.payment_status)}</p>
            <div className="order-history__row"><strong>{money(item.total)}</strong><button type="button" className="shop-button shop-button--outline" aria-label={`View order ${item.reference}`} onClick={() => navigate(item.id)}>View details</button></div>
          </li>)}</ul>
          <nav className="order-history__row" aria-label="Order history pages">
            <button type="button" className="shop-button shop-button--outline" disabled={page <= 1} onClick={() => navigate(null, page - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, Math.ceil(result.total / result.page_size))}</span>
            <button type="button" className="shop-button shop-button--outline" disabled={page * result.page_size >= result.total} onClick={() => navigate(null, page + 1)}>Next</button>
          </nav>
        </>}
      </>}
      {!loading && !error && selectedId !== null && order && <OrderDetails order={order} />}
    </div>
  </Overlay>
}

function OrderDetails({ order }: { order: Order }) {
  return <>
    <h3>{order.reference}</h3>
    <p><time dateTime={order.created_at}>{date(order.created_at)}</time></p>
    <p>Order: {label(order.status)} · Payment: {label(order.payment_status)}</p>
    <div className="order-history__columns">
      <section><h4>Contact</h4><p>{order.full_name}</p><p>{order.email}</p><p>{order.phone}</p></section>
      <section><h4>{order.delivery_method === 'ship' ? 'Home delivery' : 'Store pickup'}</h4>
        {order.delivery_method === 'ship' ? <><p>{[order.street_address, order.ward_name, order.province_name].filter(Boolean).join(', ')}</p><p>{label(order.shipping_method ?? '')}</p></> : <><p>{order.pickup_name}</p><p>{order.pickup_address}</p></>}
      </section>
    </div>
    <h4>Products</h4>
    <ul className="order-history__list">{order.items.map(item => <li key={item.product_id} className="order-history__product">
      <img src={item.product_image} alt={item.product_name} />
      <div><strong>{item.product_name}</strong><p>{item.quantity} × {money(item.unit_price)}</p><strong>{money(item.line_total)}</strong></div>
    </li>)}</ul>
    <dl className="order-history__totals">
      <dt>Subtotal</dt><dd>{money(order.subtotal)}</dd>
      <dt>Shipping</dt><dd>{money(order.shipping_fee)}</dd>
      <dt>Total</dt><dd><strong>{money(order.total)}</strong></dd>
      <dt>Payment method</dt><dd>{label(order.payment_method)}</dd>
    </dl>
    {order.payment_status === 'pending' && <p>Payment has not been confirmed.</p>}
  </>
}
