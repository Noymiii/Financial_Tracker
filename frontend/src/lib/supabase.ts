import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (!_client) {
        if (!supabaseUrl) {
            throw new Error(
                "NEXT_PUBLIC_SUPABASE_URL is not set. " +
                "Copy .env.local.example to .env.local and fill in your credentials."
            );
        }
        _client = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _client;
}

// Proxy that lazily initializes only when accessed at runtime
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return Reflect.get(getClient(), prop);
    },
});
