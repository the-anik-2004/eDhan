import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALL_CURRENCIES, CurrencyPicker } from '../../../components/CurrencyPicker';
import { useSupabase } from '../../../hooks/useSupabase';
import { OnboardingFormValues, onboardingSchema } from '../../../lib/schema/onboarding.schema';
import { useUserStore } from '../../../store/userStore';


export default function OnboardingScreen() {
  const {user} =useUser();
  const setCurrency = useUserStore((s)=> s.setCurrency)
  const setNeedsOnboarding = useUserStore((s)=> s.setNeedsOnboarding)
  const authSupabase = useSupabase();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState:{errors:formErrors}
  } = useForm<OnboardingFormValues>(
    {
      resolver:zodResolver(onboardingSchema),
      mode:"onBlur",
      defaultValues:{startingBalance:""}
    }
  );

  const [selectedCurrency,setSelectedCurrency]=useState(
    ALL_CURRENCIES.find((c)=>c.code==="INR")?? ALL_CURRENCIES[0],
  )
  const [pickerOpen,setPickerOpen]=useState(false);
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState("");

  const handleSave = async({startingBalance}:OnboardingFormValues) =>{
    if (!user) {
      setError("Unable to load your account. Please try again.");
      return;
    }

    const parsed = parseFloat(startingBalance.replace(/,/g, ""));
    setSaving(true);
    setError("");

    try {
      const {error: updateError} = await authSupabase
        .from("users")
        .update({currency: selectedCurrency.code})
        .eq("clerk_id", user.id);

      if (updateError) {
        console.error("Error updating user currency:", updateError);
        setError("Something went wrong. Please try again.");
        return;
      }

      const {data: defaultAccount, error: accountFetchError} = await authSupabase
        .from("accounts")
        .select("id,balance")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .single();

      if (accountFetchError || !defaultAccount) {
        console.error("Error fetching default account:", accountFetchError);
        setError("Something went wrong. Please try again.");
        return;
      }

      const {error: txError} = await authSupabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: defaultAccount.id,
          type: "INCOME",
          amount: parsed,
          category: "other_income",
          description: "Starting Balance",
          date: new Date().toISOString(),
          input_method: "MANUAL",
        });

      if (txError) {
        console.error("Error creating starting balance transaction:", txError);
        setError("Something went wrong. Please try again.");
        return;
      }

      const {error: balanceError} = await authSupabase
        .from("accounts")
        .update({balance: defaultAccount.balance + parsed})
        .eq("id", defaultAccount.id);

      if (balanceError) {
        console.error("Error updating default account balance:", balanceError);
        setError("Something went wrong. Please try again.");
        return;
      }

      setCurrency(selectedCurrency.code);
      setNeedsOnboarding(false);
      router.replace("/(root)/(tabs)");
    } catch (saveError) {
      console.error("Unexpected onboarding save error:", saveError);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
    className="flex-1 bg-background" edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS==="ios"?"padding":"height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center items-stretch px-6 -mt-16 gap-3">
        <Image
          source={require('../../../assets/images/edl.png')}
          className="w-36 h-14 mb-8"
          resizeMode="contain"
        />
        <Text className="text-left text-3xl font-bold text-[#1A1D26]  leading-tight">Let&apos;s get you set up</Text>
        <Text className="text-left text-base text-gray-600 mb-2 leading-tight">A couple of quick details to personalize your experience.</Text>

          <Text className="text-lg mt-4 font-medium ">Starting Balance</Text>
          <View className="flex-row items-center bg-white border border-[#E8E6DF] rounded-xl px-4 mb-1">
            <Text className="text-md mr-2">
              {selectedCurrency.symbol}
            </Text>

               <Controller
            control={control}
            name="startingBalance"
            render={({ field: { value, onChange } }) => (

              <TextInput
                className="w-full text-left  bg-white rounded-xl px-4 py-3 mb-1 text-[#1A1D26]"
                placeholder="e.g. 50000"
                placeholderTextColor="#8A8D96"
                returnKeyType="done"
                keyboardType="numeric"
                value={value}
                onChangeText={(v)=>{
                  setError("");
                  onChange(v);
                }}
                autoCapitalize="none"
              />
            )}
          />
          </View>
       
          {formErrors.startingBalance && (
            <Text className="text-red-600 text-sm">
              {formErrors.startingBalance.message}
            </Text>
          )}

          <View className="mb-3"/>

          {/* Currency Picker */}
          <Text 
          className="text-black text-sm font-medium mb-1">
            Currency
          </Text>
          <TouchableOpacity
            onPress={()=>setPickerOpen(true)}
            className="flex-row items-center justify-between bg-white border border-[#E8E6DF] rounded-xl px-4 py-3.5 mb-6"
          >
            <Text className="text-sm Otext-brand-bg">
              {selectedCurrency.symbol} {selectedCurrency.code} -{" "}
              {selectedCurrency.name}
              </Text>
              <Feather name="chevron-down" size={16} color="#8A8D96" />
            </TouchableOpacity>
            {
              error?(
                <Text className="text-brand-coral text-xs mb-4">{error}</Text>
              ):null
            }

          <TouchableOpacity
            onPress={() => {
              void handleSubmit(handleSave)();
            }}
            disabled={saving}
            className="rounded-xl py-4 items-center bg-black"
            activeOpacity={0.85}  
          >

              <Text className="text-white font-semibold text-base">
                {saving?"Saving ..." : "Get Started"}
              </Text>
         
          </TouchableOpacity>

      </View>

      </KeyboardAvoidingView>
      <CurrencyPicker
        visible={pickerOpen}
        selectedCode={selectedCurrency.code}
        onSelect={(currency)=>{
          setSelectedCurrency(currency);
          setPickerOpen(false)
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  )
}