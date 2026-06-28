// billing.js — Google Play subscription unlock for Montréal+.
//
// Uses cordova-plugin-purchase (CdvPurchase v13), which talks DIRECTLY to
// Google Play Billing — no third-party service. In a plain browser (no native
// bridge) every function no-ops and `billing.available` stays false, so the web
// preview keeps its demo behaviour.
//
// NOT YET TESTED ON A DEVICE. The purchase/verify flow can only be exercised on
// a real Android build with the products live in Play Console. Treat the order/
// reconcile paths as reviewed-but-unverified until that test passes.
//
// Play Console setup (see PLAY_STORE.md): create three SUBSCRIPTION products
// with exactly these IDs, each with a base plan, then add a license tester.

export const PLAN_PRODUCTS = {
  Household: 'montrealplus.sub.household',
  Pro: 'montrealplus.sub.pro',
  Team: 'montrealplus.sub.team'
}

const TIER_RANK = { Free: 0, Household: 1, Pro: 2, Team: 3 }

export const billing = { available: false, ready: false, _onChange: null }

function bridge() {
  return (typeof window !== 'undefined' && window.CdvPurchase) ? window.CdvPurchase : null
}

function isOwned(store, id) {
  try {
    if (typeof store.owned === 'function') return store.owned(id)
    const product = store.get(id)
    return !!(product && product.owned)
  } catch {
    return false
  }
}

// Notify the app of the highest-tier plan currently owned (or 'Free').
function reconcile(store) {
  const best = Object.entries(PLAN_PRODUCTS)
    .filter(([, id]) => isOwned(store, id))
    .map(([plan]) => plan)
    .sort((a, b) => TIER_RANK[b] - TIER_RANK[a])[0] || 'Free'
  if (billing._onChange) billing._onChange(best)
}

// Initialise billing. `onChange(planName)` fires after any verified purchase or
// restore. Resolves true when native billing is wired, false in the browser.
export async function initBilling(onChange) {
  billing._onChange = onChange
  const CdvPurchase = bridge()
  if (!CdvPurchase) return false

  billing.available = true
  const { store, ProductType, Platform } = CdvPurchase

  store.register(Object.values(PLAN_PRODUCTS).map(id => ({
    id,
    type: ProductType.PAID_SUBSCRIPTION,
    platform: Platform.GOOGLE_PLAY
  })))

  store.when()
    .approved(t => t.verify())
    .verified(receipt => { receipt.finish(); reconcile(store) })
    .unverified(() => reconcile(store))
    .receiptUpdated(() => reconcile(store))

  await store.initialize([Platform.GOOGLE_PLAY])
  billing.ready = true
  reconcile(store)
  return true
}

// Start a subscription purchase for a plan name.
// Resolves true if an order was launched, false if billing isn't usable here.
export async function purchasePlan(planName) {
  const CdvPurchase = bridge()
  const productId = PLAN_PRODUCTS[planName]
  if (!CdvPurchase || !productId) return false
  const product = CdvPurchase.store.get(productId, CdvPurchase.Platform.GOOGLE_PLAY)
  const offer = product && product.getOffer()
  if (!offer) return false
  await CdvPurchase.store.order(offer)
  return true
}

// Restore previously purchased subscriptions ("Restore purchases" button).
export async function restorePurchases() {
  const CdvPurchase = bridge()
  if (!CdvPurchase) return false
  await CdvPurchase.store.restorePurchases()
  return true
}
