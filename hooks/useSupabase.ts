import { useAuth } from "@clerk/expo";
import { createClerkSupabaseClient } from "../lib/schema/supabase";
import { useMemo } from "react";


export function useSupabase(){
    const {getToken}=useAuth();

    const client = useMemo(
        ()=> createClerkSupabaseClient(()=> getToken()),
        [],
    );
    return client;
}