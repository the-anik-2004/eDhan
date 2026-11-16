import { useAuth } from "@clerk/expo";
import { Redirect, Slot, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { useUserStore } from "../../../store/userStore";
import { useUserSync } from "../../../hooks/useUserSync";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export default function RootGroupLayout(){
    const {isSignedIn, isLoaded} = useAuth();
    const needsOnboarding=useUserStore((state)=> state.needsOnboarding);
    const pathName= usePathname();
    const [minLoadDone,setMinLoadDone]= useState(false);

    const {syncError, retrySync} = useUserSync();

    useEffect(()=>{
        const t  = setTimeout(()=>setMinLoadDone(true),1500);
        return ()=> clearTimeout(t);
    },[])

    if(!isLoaded) return null;
    if(!isSignedIn) return <Redirect href="/sign-in"/>

    if (syncError && needsOnboarding === null) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="mb-4 text-center text-[#1A1D26]">{syncError}</Text>
                <TouchableOpacity
                    accessibilityRole="button"
                    onPress={retrySync}
                    className="rounded-xl bg-[#1D4E5B] px-6 py-3"
                >
                    <Text className="font-semibold text-white">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!minLoadDone || needsOnboarding ===null){
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#1A1D26"/>
            </View>
        )
    }

    if( needsOnboarding && pathName !=="/onboarding"){
        return <Redirect href="/(root)/onboarding"/>
    }

    return <Slot />;
}