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

                if(existingUser){
                    if (cancelled) return;
                    setCurrency(existingUser.currency ?? "INR");
                    setNeedsOnboarding(!existingUser.currency);
                    return;
                }

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

                if (cancelled) return;
                setCurrency(newUser?.currency??"INR");
                setNeedsOnboarding(!newUser?.currency);

                const {error: accountError}= await authSupabase
                                                    .from('accounts')
                                                    .insert({
                                                        user_id:userId,
                                                        name:'Cash',
                                                        type:"CASH",
                                                        balance: 0,
                                                        is_default: true,
                                                    });
                if (accountError){
                    console.error("Error creating default account",accountError); 
                }
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