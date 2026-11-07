// Vercel serverless function: POST /api/fetch-page { url } with the teacher's Supabase access token as a Bearer token.
// Reads one public web page as article text for "Paste a link" on the order page. All of the logic and the
// address guard live in scripts/fetch-page.mjs (docs/BACKEND.md, "Paste a link"). It needs only the two settings the
// site already has in Vercel: PP_SUPABASE_URL and PP_SUPABASE_ANON_KEY (no service key, no new secret).
import { createHandler } from '../scripts/fetch-page.mjs';

export default createHandler();
