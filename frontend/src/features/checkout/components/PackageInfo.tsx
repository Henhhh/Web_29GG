export default function PackageInfo({ count }: { count: number }) {
  return <fieldset><legend>03 / Package info</legend><div className="checkout-package"><span>Items<strong>{count} pcs</strong></span><span>Est. weight<strong>{(count * 0.4).toFixed(1)} kg</strong></span><span>Dimensions<strong>Standard box</strong></span></div><p className="commerce-muted">Estimated package details for this demo.</p></fieldset>
}
