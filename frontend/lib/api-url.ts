/**
 * Local development uses the separately started FastAPI server. A Vercel
 * Services deployment routes the API through the same origin under /api.
 */
export const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')
  ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');
