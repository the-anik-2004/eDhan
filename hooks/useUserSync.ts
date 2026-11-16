import {useUser} from "@clerk/expo";
import { useUserStore } from "../store/userStore";
import { useSupabase } from "./useSupabase";
import { useCallback, useEffect, useState } from "react";

export const useUserSync =() =>{
    const {user} = useUser();
    const userId = user?.id;
    const email = user?.emailAddresses[0]?.emailAddress;
    const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
    const imageUrl = user?.imageUrl;
    const setCurrency = useUserStore((state)=>state.setCurrency);
    const setNeedsOnboarding = useUserStore((state)=>state.setNeedsOnboarding)
    const authSupabase = useSupabase();
    const [retryCount, setRetryCount] = useState(0);
    const [syncFailure, setSyncFailure] = useState<{userId:string; message:string} | null>(null);
    const syncError = syncFailure && syncFailure.userId === userId
        ? syncFailure.message
        : null;

    const retrySync = useCallback(() => {
        setSyncFailure(null);
        setRetryCount((count) => count + 1);
    }, []);

    useEffect(()=>{
        if(!userId) return;

        let cancelled = false;
        setNeedsOnboarding(null);

        const syncUser =  async () => {
            try{
                const {data:existingUser, error: fetchError}
                = 
                await authSupabase.from("users").select("clerk_id,currency").eq("clerk_id",userId).single();
                
                if(fetchError && fetchError.code!== "PGRST116"){
                    throw fetchError;
                }

                let currency: string | null;
                if(existingUser){
                    currency = existingUser.currency;
                } else {
                    if (!email) {
                        throw new Error("User has no email address");
                    }

                    const {data: newUser,error:insertError}=
                    await authSupabase
                                    .from("users")
                                    .upsert({
                                        clerk_id:userId,
                                        email,
                                        name,
                                        image_url:imageUrl,
                                    })
                                    .select("currency")
                                    .single();

                    if(insertError){
                        throw insertError;
                    }

                    if (!newUser) {
                        throw new Error("User upsert returned no user");
                    }
                    currency = newUser.currency;
                }

                if (cancelled) return;

                const {data: defaultAccount, error: accountFetchError} = await authSupabase
                    .from("accounts")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("is_default", true)
                    .limit(1)
                    .maybeSingle();

                if (accountFetchError) {
                    throw accountFetchError;
                }

                if (!defaultAccount) {
                    const {error: accountError} = await authSupabase
                        .from("accounts")
                        .insert({
                            user_id: userId,
                            name: "Cash",
                            type: "CASH",
                            balance: 0,
                            is_default: true,
                        });

                    if (accountError) {
                        throw accountError;
                    }
                }

                if (cancelled) return;
                setCurrency(currency ?? "INR");
                setNeedsOnboarding(!currency);
            }catch(error){
                console.error("Error syncing user:", error);
                if (!cancelled) {
                    setSyncFailure({
                        userId,
                        message: "We couldn't sync your account. Check your connection and try again.",
                    });
                }
            }
        };

        void syncUser();
        return () => {
            cancelled = true;
        };
    },[authSupabase, email, imageUrl, name, retryCount, setCurrency, setNeedsOnboarding, userId])

    return {syncError, retrySync};
};