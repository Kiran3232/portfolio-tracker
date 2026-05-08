export type SupportedCurrency = 'INR' | 'USD'

export function formatMoney(
  amount: number,
  currency: SupportedCurrency = 'INR',
  locale?: string
) {
  const resolvedLocale =
    locale || (currency === 'INR' ? 'en-IN' : 'en-US')

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  usdInrRate: number
) {
  if (!Number.isFinite(amount)) return 0
  if (from === to) return amount
  if (from === 'USD' && to === 'INR') return amount * usdInrRate
  if (from === 'INR' && to === 'USD') return amount / usdInrRate
  return amount
}