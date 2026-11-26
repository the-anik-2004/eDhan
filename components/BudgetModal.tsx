import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/themes';
import { useUpsertBudget } from '../hooks/mutations/useBudgetMutations';
import { Budget } from '../lib/services/budgets.services';
import FormSheetModal from './FormSheetModal';

export default function BudgetModal(
    {visible,budget,onClose,onSaved}:
    {
        visible:boolean;
        budget:Budget | null;
        onClose: ()=> void;
        onSaved: ()=> void;
    }
) {
    const [amount,setAmount] = useState("");
    const [error,setError] = useState("");

    const {mutateAsync: upsertBudget, isPending:saving}= useUpsertBudget();

    useEffect(()=>{
        if(visible){
            setAmount(budget? String(budget.amount):"");
            setError("");
        }
    },[visible,budget]);

    
    const handleSave = async () => {
        const parsedAmount = parseFloat(amount.replace(/,/g, ""));

        if (!parsedAmount || parsedAmount <= 0) {
            setError("Enter a valid monthly budget.");
            return;
        }

        setError("");
     try{
        await upsertBudget(parsedAmount);
        onSaved();
        }catch (err) {
        console.error("Error saving budget:", err);
        setError("Something went wrong. Please try again.");
        }
    };

  return (
    <FormSheetModal
        visible={visible}
        title={budget?"Edit monthly budget" : "Set monthly budget"}
        onClose={onClose}
    >
    <Text className="Otext-black text-xs font-medium mb-1.5">
        Monthly budget
    </Text>

    <TextInput
        value={amount}
        onChangeText={(v)=> {
        setError("");
        setAmount(v);
    }}
    placeholder="e.g. 50000"
    placeholderTextColor={COLORS.placeholder}
    keyboardType="numeric"
    autoFocus
    className=" rounded-xl bg-white border ltext-black border-[#E8E6DF] rounded-x1 px-4 py-3 mb-5 text-sm"
    />
    {error ? (
        <Text className="text-red-400 text-xs mb-3 ">{error}</Text>
    ):null}

    <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="bg-black rounded-xl py-4 items-center mb-3"
        activeOpacity={0.85}>
        <Text className="text-white text-md font-semibold">
        {saving ? "Saving ... " : "Save budget"}
        </Text>
</TouchableOpacity>

    </FormSheetModal>
  )
}