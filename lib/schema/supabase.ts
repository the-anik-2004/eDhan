import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supasbaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

if (!supabaseUrl || !supasbaseAnonKey){
    throw new Error (
        "Missing Supabase env vars. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to your .env file."
    );
}

export function createClerkSupabaseClient(getToken:()=> Promise<string | null>){
    return createClient(supabaseUrl,supasbaseAnonKey,{
        async accessToken(){
            return getToken();
        }
    })
}