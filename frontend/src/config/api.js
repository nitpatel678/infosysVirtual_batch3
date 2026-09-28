// Centralized API Base Configuration for SentryAI
// In local dev, falls back to http://127.0.0.1:8000
// In Vercel production deployment, set VITE_API_BASE_URL in Vercel project environment variables

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

export default API_BASE_URL
