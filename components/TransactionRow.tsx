import { Feather } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { getCategoryConfig } from '../constants/categories';
import { Transaction } from '../lib/services/transactions.services';
import { formatPrice } from '../lib/utils';

const INPUT_METHOD_ICON: Record<Transaction["input_method"],keyof typeof Feather.glyphMap>={
    MANUAL:"edit-3",
    RECEIPT_SCAN:"camera",
    VOICE:"mic"
}

export default function TransactionRow({tx, onDelete}:{
    tx:Transaction
    onDelete?:()=>void
}) {
    const config =getCategoryConfig(tx.category);
    const isIncome = tx.type ==="INCOME";


const row =(
    <View
    className="flex-row items-center border border-[#E8E6DF] pl-3 pr-3.5 py-4 rounded-xl bg-white"
    style={{borderLeftWidth: 3, borderLeftColor: config.color }}
    >
        <View
            className="flex-1/3 w-10 h-10 rounded-full items-center justify-center mr-3 "
            style={{backgroundColor:`${config.color}40`}}
        >
            <Text className="text-lg">{config.icon}</Text>
        </View>

        <View className="flex-1">
            <Text className="text-black text-sm font-medium" numberOfLines={1}>
                {tx.description || config.label}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
                <Feather 
                    name={INPUT_METHOD_ICON[tx.input_method]}
                    size={11}
                    color="#8A8D96"
                />
                <View 
                 className="px-1.5 py-0.5 rounded-full"
                 style={{backgroundColor:`${config.color}1A`}}>
                   <Text
                   className="text-[11px] font-medium"
                   style={{color:config.color}} >
                    {config.label}
                   </Text>
                </View>
                {tx.is_flagged && (
                    <View className="flex-row items-center gap-1 ml-1">
                        <Feather name="alert-triangle" size={11} color="#FF6B4A"/>
                        <Text className="text-red-700 text-[11px]">Flagged</Text>
                    </View>
                )}
            </View>
        </View>
        <Text
            className={`text-sm font-medium ${isIncome? "text-green-400":"text-red-400"}`}
        >
            {isIncome?"+": "-"}
            {formatPrice(tx.amount)}
        </Text>
    </View>
);

if(!onDelete){
    return <View className="mb-2.5">{row}</View>
}


  return (
    <View className="mb-2.5">
        <ReanimatedSwipeable
            renderRightActions={() => (
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Delete transaction"
                    className="items-center justify-center rounded-xl bg-red-500 px-5 ml-2 w-16"
                    onPress={onDelete}
                >
                    <Feather name="trash-2" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            )}
        >
            {row}
        </ReanimatedSwipeable>
    </View>
  )
}