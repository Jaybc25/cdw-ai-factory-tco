import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fails loudly in the console rather than silently returning a broken
  // client -- if these are missing, every tool's login will just hang
  // otherwise, which is much harder to debug.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
    "Check Vercel Environment Variables for this project."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
