import type { FormProps } from '../models/checkoutModel'
import CheckoutField from './CheckoutField'
export default function ContactForm(props: FormProps) {
  return <fieldset><legend>01 / Contact</legend><CheckoutField {...props} name="fullName" label="Full name" /><div className="checkout-columns"><CheckoutField {...props} name="email" label="Email" type="email" /><CheckoutField {...props} name="phone" label="Phone" type="tel" /></div></fieldset>
}
