import { useId } from 'react'
import { shippingOptions, type FormProps } from '../models/checkoutModel'
import type { PickupStore } from '../../cart/cartApi'
import { money } from '../../cart/models/cartModel'
import ShippingAddressForm from './ShippingAddressForm'
export default function DeliveryOptions({ value, onChange, stores }: FormProps & { stores: PickupStore[] }) {
  const id = useId()
  return <fieldset><legend>02 / Delivery method</legend><div className="checkout-columns">
    {(['ship', 'pickup'] as const).map(method => <label className="checkout-choice" key={method}><input type="radio" name={`${id}-delivery`} checked={value.delivery === method} onChange={() => onChange({ ...value, delivery: method })} /><span>{method === 'ship' ? '🚚 Home delivery' : '🏪 Store pickup'}<small>{method === 'ship' ? 'Shipped to your address' : 'Ready in 2–4 hours (demo)'}</small></span></label>)}
  </div>{value.delivery === 'ship' ? <>
    {shippingOptions.map(option => <label className="checkout-choice" key={option.id}><input type="radio" name={`${id}-shipping`} checked={value.shipping === option.id} onChange={() => onChange({ ...value, shipping: option.id })} /><span>{option.label}<small>{option.eta}</small></span><strong>{option.price ? money(option.price) : 'FREE'}</strong></label>)}
    <ShippingAddressForm value={value} onChange={onChange} />
  </> : <div>{stores.map(store => <label className="checkout-choice" key={store.id}><input type="radio" name={`${id}-store`} checked={value.store === store.id} onChange={() => onChange({ ...value, store: store.id })} /><span>{store.name}<small>{store.address}</small></span></label>)}</div>}</fieldset>
}
