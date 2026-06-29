// billing.js — Unified billing for Montréal+ (Android + iOS).
//
// Detects platform at runtime and delegates to the appropriate adapter:
// - Android: cordova-plugin-purchase (Google Play Billing)
// - iOS: @capacitor-community/in-app-purchases (StoreKit 2)
// - Browser: no-op (demo mode)

export const PLAN_PRODUCTS = {
  Household: 'montrealplus.sub.household',
  Pro: 'montrealplus.sub.pro',
  Team: 'montrealplus.sub.team'
}

const TIER_RANK = { Free: 0, Household: 1, Pro: 2, Team: 3 }

export const billing = { available: false, ready: false, _onChange: null, _platform: null }

function detectPlatform() {
  if (typeof window === 'undefined') return 'browser'
  if (window.CdvPurchase) return 'android'
  if (window.CapacitorInAppPurchases) return 'ios'
  // Capacitor platform detection
  if (window.Capacitor?.getPlatform) {
    const p = window.Capacitor.getPlatform()
    if (p === 'android') return 'android'
    if (p === 'ios') return 'ios'
  }
  return 'browser'
}

// --- Android adapter (cordovan-plugin-purchase) ---
function isOwnedAndroid(store, id) {
  try {
    if (typeof store.owned === 'function') return store.owned(id)
    const product = store.get(id)
    return !!(product && product.owned)
  } catch { return false }
}

function reconcileAndroid(store) {
  const best = Object.entries(PLAN_PRODUCTS)
    .filter(([, id]) => isOwnedAndroid(store, id))
    .map(([plan]) => plan)
    .sort((a, b) => TIER_RANK[b] - TIER_RANK[a])[0] || 'Free'
  if (billing._onChange) billing._onChange(best)
}

async function initAndroid(onChange) {
  billing._onChange = onChange
  const CdvPurchase = window.CdvPurchase
  if (!CdvPurchase) return false

  billing.available = true
  const { store, ProductType, Platform } = CdvPurchase

  store.register(Object.values(PLAN_PRODUCTS).map(id => ({
    id, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.GOOGLE_PLAY
  })))

  store.when()
    .approved(t => t.verify())
    .verified(receipt => { receipt.finish(); reconcileAndroid(store) })
    .unverified(() => reconcileAndroid(store))
    .receiptUpdated(() => reconcileAndroid(store))

  await store.initialize([Platform.GOOGLE_PLAY])
  billing.ready = true
  reconcileAndroid(store)
  return true
}

async function purchaseAndroid(planName) {
  const CdvPurchase = window.CdvPurchase
  const productId = PLAN_PRODUCTS[planName]
  if (!CdvPurchase || !productId) return false
  const product = CdvPurchase.store.get(productId, CdvPurchase.Platform.GOOGLE_PLAY)
  const offer = product && product.getOffer()
  if (!offer) return false
  await CdvPurchase.store.order(offer)
  return true
}

async function restoreAndroid() {
  const CdvPurchase = window.CdvPurchase
  if (!CdvPurchase) return false
  await CdvPurchase.store.restorePurchases()
  return true
}

// --- iOS adapter (@capacitor-community/in-app-purchases) ---
function reconcileIOS(products) {
  const best = Object.entries(PLAN_PRODUCTS)
    .filter(([, id]) => {
      const p = products?.find(pr => pr.productId === id)
      return p && p.owned
    })
    .map(([plan]) => plan)
    .sort((a, b) => TIER_RANK[b] - TIER_RANK[a])[0] || 'Free'
  if (billing._onChange) billing._onChange(best)
}

async function initIOS(onChange) {
  billing._onChange = onChange
  const IAP = window.CapacitorInAppPurchases
  if (!IAP) return false

  billing.available = true
  try {
    await IAP.initialize()
    const { products } = await IAP.getProducts({ productIds: Object.values(PLAN_PRODUCTS) })
    IAP.addListener('purchaseEvent', (event) => reconcileIOS(event.products))
    const { entitlements } = await IAP.restorePurchases()
    billing.ready = true
    reconcileIOS(products)
    if (entitlements) reconcileIOS(entitlements)
    return true
  } catch (err) {
    console.error('[billing-ios] init failed:', err)
    return false
  }
}

async function purchaseIOS(planName) {
  const IAP = window.CapacitorInAppPurchases
  const productId = PLAN_PRODUCTS[planName]
  if (!IAP || !productId) return false
  try {
    await IAP.purchase({ productId })
    return true
  } catch (err) {
    console.error('[billing-ios] purchase failed:', err)
    return false
  }
}

async function restoreIOS() {
  const IAP = window.CapacitorInAppPurchases
  if (!IAP) return false
  try {
    const { entitlements } = await IAP.restorePurchases()
    reconcileIOS(entitlements)
    return true
  } catch { return false }
}

// --- Unified API ---
export async function initBilling(onChange) {
  billing._platform = detectPlatform()
  if (billing._platform === 'android') return initAndroid(onChange)
  if (billing._platform === 'ios') return initIOS(onChange)
  return false
}

export async function purchasePlan(planName) {
  if (billing._platform === 'android') return purchaseAndroid(planName)
  if (billing._platform === 'ios') return purchaseIOS(planName)
  return false
}

export async function restorePurchases() {
  if (billing._platform === 'android') return restoreAndroid()
  if (billing._platform === 'ios') return restoreIOS()
  return false
}
