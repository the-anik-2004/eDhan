import { Feather } from "@expo/vector-icons";
import cc from "currency-codes";
import getSymbol from "currency-symbol-map";
import { useMemo, useState } from "react";
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type CurrencyEntry = {code:string , name:string , symbol:string};

export const ALL_CURRENCIES: CurrencyEntry[] = cc.codes().map(
    (code)=>({
        code,
        name:cc.code(code)?.currency ?? code,
        symbol: getSymbol(code) ?? code
    }))
    .filter((c)=>c.symbol!== c.code);

export function CurrencyPicker(
    {visible,selectedCode,onSelect,onClose}
    :{
        visible:boolean;
        selectedCode:string;
        onSelect:(currency:CurrencyEntry)=>void;
        onClose:()=>void
    }
){
    const [search,setSearch]=useState("");
    const filteredCurrencies = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return ALL_CURRENCIES;

        return ALL_CURRENCIES.filter(({ code, name, symbol }) =>
            `${code} ${name} ${symbol}`.toLowerCase().includes(query),
        );
    }, [search]);

    const handleClose = () => {
        setSearch("");
        onClose();
    };

    const filtered = useMemo(()=>{
        const q= search.toLowerCase();
        if (!q) return ALL_CURRENCIES;
        return ALL_CURRENCIES.filter(
            (c)=>
                c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
        );
    },[search])

    return (
        <Modal
            visible={visible} animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView
            className="flex-1 bg-white"
            edges={["top"]}>
                <View className="flex-row items-center px-5 pt-3 pb-2 gap-3">
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search currency..."
                        className="flex-1 bg-white border border-[#E8E6DF] rounded-full px-4 py-2.5 text-sm text-black"
                        placeholderTextColor="#8A8D96"
                        autoFocus
                    />
                    <TouchableOpacity
                        onPress={handleClose}
                    >
                        <Text className="text-gray-600 text-base">Cancel</Text>
                    </TouchableOpacity>
                </View>
                <FlatList 
                    data={filtered}
                    keyExtractor={(item)=>item.code}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({item})=>(
                        <TouchableOpacity
                            onPress={()=>{
                                onSelect(item)
                                setSearch("")
                            }}
                            className="flex-row items-center px-5 py-3 border-b border-[#F0EDE6]"
                        >
                            <Text className="text-grey w-8 text-sm">{item.symbol}</Text>
                            <Text className="text-black w-12 text-sm font-medium">{item.code}</Text>
                            <Text className="text-grey w-8 text-md flex-1" numberOfLines={2}>{item.name}</Text>
                            {item.code === selectedCode && (
                                <Feather name="check" size={16} color="#4A9EFF"/>
                            )}
                        </TouchableOpacity>
                    )}
                />

                {/* <FlatList
                    data={filteredCurrencies}
                    keyExtractor={(currency) => currency.code}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <Text className="px-5 py-6 text-center text-gray-500">
                            No currencies found.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => {
                                onSelect(item);
                                handleClose();
                            }}
                            className="flex-row items-center border-b border-[#E8E6DF] px-5 py-4"
                        >
                            <Text className="w-12 text-base font-semibold text-[#1A1D26]">
                                {item.symbol}
                            </Text>
                            <View className="flex-1">
                                <Text className="text-base text-[#1A1D26]">
                                    {item.name}
                                </Text>
                                <Text className="text-sm text-gray-500">
                                    {item.code}
                                </Text>
                            </View>
                            {item.code === selectedCode && (
                                <Text className="text-sm font-semibold text-[#1D4E5B]">
                                    Selected
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                /> */}
            </SafeAreaView>
        </Modal>
    )
}