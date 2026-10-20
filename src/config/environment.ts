export const ENVIRONMENT = {
   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
   supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
   googleApiKey: process.env.GOOGLE_API_KEY,
   // NEXT_PUBLIC_ karena convertCurrency juga dipakai di komponen klien
   fallbackUsdIdrRate: process.env.NEXT_PUBLIC_FALLBACK_USD_IDR_RATE,
}