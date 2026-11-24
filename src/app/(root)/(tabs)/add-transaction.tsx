import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AIActionCard from "../../../../components/AIActionCard";
import { CalendarPicker } from "../../../../components/CalenderPicker";
import { PillGroup } from "../../../../components/PillGroup";
import ReceiptScannerModal from "../../../../components/ReceiptScannerModal";
import VoiceRecorderModal from "../../../../components/VoiceRecorderModal";
import { CategoryKey, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../../../../constants/categories";
import { AI_GRADIENT, AI_GRADIENT_REVERSE } from "../../../../constants/themes";
import { useCreateTransaction } from "../../../../hooks/mutations/useTransactionMutation";
import { useAccountsQuery } from "../../../../hooks/queries/useAccountsQuery";
import { TransactionFormValues, transactionSchema } from "../../../../lib/schema/transaction";
import { Account } from "../../../../lib/services/accounts.services";
import { ExtractedTransaction, extractTransactionFromReceipt } from "../../../../lib/services/ai/extractTransaction";
import { InputMethod } from "../../../../lib/services/transactions.services";

const DEFAULT_VALUES = (accounts: Account[]): TransactionFormValues => ({
    type: "EXPENSE",
    amount: "",
    category: "food" as TransactionFormValues["category"],
    accountId: (accounts[0]?.id ?? "") as TransactionFormValues["accountId"],
    description: "",
    date: new Date(),
});

const TYPE_OPTIONS = [
  {key:"EXPENSE" as const,label:"Expense"},
  {key:"INCOME" as const,label:"Income"},
]


export default function AddTransaction() {
  const{user}=useUser();
  const router=useRouter();
  const params = useLocalSearchParams<{ action?: string }>();

  const {
    data:accounts=[],
    isLoading: loadingAccounts,
    isError:accountsError
  }=useAccountsQuery();

  const {mutateAsync : createTransaction,isPending:saving} = useCreateTransaction();

const [datePickerOpen, setDatePickerOpen] = useState(false);
const [scanning, setScanning] = useState(false);
const [scannerOpen, setScannerOpen] = useState(false);
const [voiceModalOpen, setVoiceModalOpen] = useState(false);
const[error, setError] = useState("");
const [inputMethod, setInputMethod] = useState<InputMethod>("MANUAL");
const [voiceTranscript,setVoiceTranscript] = useState("");


const {
  control,
  handleSubmit,
  watch,
  setValue,
  reset: resetForm,
  formState: { errors },
} = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES([]),
})


const applyExtraction=(result:ExtractedTransaction)=>{
      const categoryList = result.type ==="INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

      const isValidCategory=(key:CategoryKey | null):key is CategoryKey=> !!key && categoryList.some((c)=>c.key===key);
      if(result.type)setValue("type",result.type);
      if(isValidCategory(result.category))setValue("category",result.category);
      else if(result.type)setValue("category",categoryList[0].key);
      if(result.amount!=null)setValue("amount",String(result.amount));
      if(result.description) setValue("description",result.description);
      if(result.date){
        const parsedDate = new Date(result.date);
        if(isValid(parsedDate) && parsedDate<=new Date()){
          setValue("date",parsedDate);
        }
      }

      const missing = [
        result.amount == null && "amount",
        !isValidCategory(result.category) && "category",
      ].filter(Boolean);

      if(missing.length>0){
        Alert.alert(
          "Review before saving",
          `Couldn't confidently read the ${missing.join(" and ")}. Please fill it in.`,
        )
      }
    };    



const type = watch("type");
const category = watch("category");
const accountId = watch("accountId");
const date = watch("date");

const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

useEffect(()=>{
  if(accounts.length>0) resetForm(DEFAULT_VALUES(accounts));
},[accounts,resetForm]);


const handleReceiptCaptured=async( base64:string,mimeType:string)=>{
    setScannerOpen(false);
    setScanning(true);
    try {
      const extracted = await extractTransactionFromReceipt(base64,mimeType);
      applyExtraction(extracted);
      setInputMethod("RECEIPT_SCAN");
    } catch (error) {
      console.error("Receipt scan failed: ",error);
      const timedOut = error instanceof Error && error.message.includes("timed out");
      Alert.alert(
        timedOut ? "Scan timed out" : "Error",
        timedOut
          ? "The receipt is taking too long to read. Check your connection and try again, or enter manually."
          : "Couldn't read that receipt. Try again or enter manually.",
      )
    } finally {
      setScanning(false);
    }
}

const handleVoiceExtracted=async(result:ExtractedTransaction)=>{
  applyExtraction(result);
  setVoiceTranscript(result.transcript ?? "")
  setInputMethod("VOICE")

};

useEffect(()=>{
  if(params.action === "scan"){
    setScannerOpen(true);
    router.setParams({action:undefined})
  }else if(params.action === "voice"){
    setVoiceModalOpen(true);
    router.setParams({action:undefined});
  }
},[params.action,router])

const onSubmit= async(values:TransactionFormValues)=>{
  if(!user){
    setError("Please sign in before saving.");
    return;
  }
  if(!values.accountId){
    setError("Select an account before saving.");
    return;
  }
  setError("");
  const parsed =parseFloat(values.amount.replace(/,/g,""));

  try{
    const {error:createError}= await createTransaction({
      user_id:user.id,
      account_id:values.accountId,
      type:values.type,
      amount:parsed,
      category:values.category,
      description:values.description?.trim() || null,
      date:format(values.date,"yyyy-MM-dd"),
      input_method:inputMethod,
      voice_transcript: voiceTranscript,
    });

    if(createError){
      console.error("Create transaction failed:", createError);
      setError(createError.message || "Could not save the transaction.");
      return;
    }

    resetForm(DEFAULT_VALUES(accounts));

    if(router.canGoBack()){
      router.back();
    }else{
      router.replace("/(root)/(tabs)/transactions");
    }
  }catch(saveError){
    console.error("Create transaction threw:", saveError);
    setError(saveError instanceof Error ? saveError.message : "Could not save the transaction.");
  }
}
return (
        <SafeAreaView className="flex-1 bg-background " edges={["top"]}>
          <View className="px-5 pt-3 pb-2">
            <Text className="text-black text-xl font-semibold">
              Add Transactions
            </Text>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS ==="ios"? "padding":"height"}
            className="flex-1" 
          >
            {loadingAccounts ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#4A9EFF"/>
              </View>
            ):accountsError ? (
              <View className="flex-1 items-center justify-center px-10">
                <Feather name="alert-circle" size={32} color="#FF6B4A"/>
                <Text className="text-zinc-400 text-md mt-3 text-center">
                  Could not load your accounts.
                </Text>
              </View>
            ):(
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal:20,
                  paddingBottom:100,
                }}
              >
                <View className="flex-row gap-2.5 mb-4">
                  <AIActionCard
                    icon="camera"
                    title="Scan receipt"
                    subtitle="Snap a photo"
                    colors={AI_GRADIENT}
                    onPress={() => setScannerOpen(true)}
                  />
                  <AIActionCard
                    icon="mic"
                    title="Voice log"
                    subtitle="Just say it"
                    colors={AI_GRADIENT_REVERSE}
                    onPress={() =>setVoiceModalOpen(true)}
                  />
                </View>
                <View className="flex-row bg-white rounded-xl border border-[#E8E6DF] p-1 mb-4">
                  {TYPE_OPTIONS.map((t)=>(
                    <TouchableOpacity
                      key={t.key}
                      onPress={()=>{
                        setValue("type",t.key)
                        setValue("category",t.key === "INCOME" ? INCOME_CATEGORIES[0].key:EXPENSE_CATEGORIES[0].key)
                      }}
                      className={`flex-1 py-2 rounded-lg items-center ${type === t.key ? "bg-black" : ""}`}
                    >
                      <Text className={`text-sm font-medium ${type === t.key ? "text-white":"text-zinc-400"}`}>
                        {t.label}
                        </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-black text-xs font-medium mb-1.5">
                  Amount
                </Text>
                <Controller
                    control={control}
                    name="amount"
                    render={({field: {value, onChange, onBlur } }) =>
                      <TextInput
                        value={value}
                        onChangeText={(v) => {
                          setError("");
                          onChange(v);
                          }}
                        onBlur={onBlur}
                        placeholder="0"
                        placeholderTextColor="#8A8D96"
                        keyboardType="numeric"
                        className="bg-white border text-zinc-700 border-[#E8E6DF] rounded-xl px-4 py-3.5 mb-4 text-sm">
                        </TextInput>}
                  />
                  {errors.amount && <Text className="text-red-400 text-sm mt-2.5">{errors.amount?.message}</Text>}

                  <View className="mb-3">
                          <Text className="text-black text-xs font-medium mb-1.5">
                            Category
                          </Text>
                          <View className="mb-4">
                            <PillGroup
                              options={categories.map((c)=>({
                                key:c.key,
                                label:c.label,
                                icon:c.icon
                              }))}
                              value={category}
                              onChange={(key)=>setValue("category",key)}
                            />
                          </View>
                  </View>

                  <View className="mb-3">
                          <Text className="text-black text-xs font-medium mb-1.5">
                            Account
                          </Text>
                          <View className="mb-4">
                            <PillGroup
                              options={accounts.map((a)=>({
                                key:a.id,
                                label:a.name
                              }))}
                              value={accountId}
                              onChange={(key)=>setValue("accountId",key)}
                            />
                          </View>
                          {errors.accountId && (
                            <Text className="text-red-400 text-sm mb-3">
                              {errors.accountId.message}
                            </Text>
                          )}
                  </View>

                  <Text className="text-black text-sm font-medium mb-1.5">Date</Text>
                  <TouchableOpacity
                    onPress={()=>setDatePickerOpen((v)=>!v)}
                    className="flex-row items-center justify-between bg-white border border-[#E8E6DF] rounded-xl px-4 py-3.5 mb-1"
                  >
                      <Text className="text-sm text-black">{format(date,"d MMM yyyy")}</Text>
                      <Feather name="calendar" size={16} color={"#5c5f68"}/>
                  </TouchableOpacity>
                  {datePickerOpen && 
                  <View className="bg-white border border-[#E8E6DF] rounded-xl mb-4 overflow-hidden">
                      <CalendarPicker 
                        value={date} 
                        maximumDate={new Date()}
                        onChange={(selectDate)=>{
                          setValue("date",selectDate);
                          setDatePickerOpen(false);
                        }}
                        />
                  </View>}
                  {
                    !datePickerOpen && <View className="mb-3"/>
                  }

                  <Text className="text-black text-sm font-medium mb-1.5">
                    Description (optional)
                  </Text>
                  <Controller
                      control={control}
                      name="description"
                      render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="e.g. Swiggy order"
                      placeholderTextColor="#8A8D96"
                      className="bg-white border border-[#E8E6DF] rounded-xl
                      px-4 py-3.5 mb-4 text-sm Otext-brand-bg"/>)}
                    />
                    {error ? (
                      <Text className="text-red-400 text-xs mb-4">{error}</Text>
                      ): null
                    }

                    <TouchableOpacity
                      onPress={() => {
                        void handleSubmit(onSubmit)();
                      }}
                      disabled={saving}
                      className="bg-black rounded-xl py-4 items-center mb-2"
                      activeOpacity={0.85}>

                      <Text className="text-white text-sm font-semibold">
                      {saving ? "Saving ... " : "Save transaction"}
                      </Text>
                    </TouchableOpacity>
                                
              </ScrollView>
            )}
          </KeyboardAvoidingView>
          {
            scanning && (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                  <View className="bg-white rounded-2xl px-6 py-5 items-center">
                    <ActivityIndicator color="#4A9EFF"/>
                    <Text className="text-black text-md mt-3">Reading Receipt...</Text>

                  </View>
              </View>
            )
          }
          <ReceiptScannerModal
              visible={scannerOpen}
              onClose={()=>setScannerOpen(false)}
              onCaptured={handleReceiptCaptured}
          />

          <VoiceRecorderModal
              visible={voiceModalOpen}
              onClose={()=>setVoiceModalOpen(false)}
              onExtracted={handleVoiceExtracted}
          />

        </SafeAreaView>
      )
}