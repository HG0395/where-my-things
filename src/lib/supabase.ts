import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
// Only the project's PUBLIC key belongs in Vite configuration. Never a service-role key.
const configured =
  url &&
  publicKey &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) &&
  !publicKey.includes("your-") &&
  !url.includes("your-project");
export const supabase = configured
  ? createClient(url, publicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
