import { createClient } from "@supabase/supabase-js";

// Server-side admin client — bypasses RLS for cron/sync operations
// Uses SUPABASE_AMC_URL (not NEXT_PUBLIC_) — safe for server-only code
const supabaseUrl = process.env.SUPABASE_AMC_URL!;
const supabaseServiceKey = process.env.SUPABASE_AMC_SERVICE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
