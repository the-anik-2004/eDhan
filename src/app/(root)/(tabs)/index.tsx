import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { isSameMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import BudgetModal from '../../../../components/BudgetModal';
import TransactionRow from '../../../../components/TransactionRow';
import { getCategoryConfig } from '../../../../constants/categories';
import { useAccountsQuery } from '../../../../hooks/queries/useAccountsQuery';
import { useBudgetQuery } from '../../../../hooks/queries/useBudgetQuery';
import { useTransactionsQuery } from '../../../../hooks/queries/useTransactionQuery';
import { Transaction } from '../../../../lib/services/transactions.services';
import { formatPrice } from '../../../../lib/utils';
import { useUserStore } from '../../../../store/userStore';

const QUICK_ACTIONS=[
{icon: "camera",label: "AI Receipt Scan",action: "scan",color: "#1A85FF"},
{ icon: "mic", label:"Voice Entry", action: "voice", color: "#FF6B4A" },
{ icon: "plus", label: "Add Manually", action: "manual", color:"#3DDC84" },
]as const;




export default function HomeScreen() {
  const {user}=useUser();
  const router = useRouter();
  const currency = useUserStore((s)=>s.currency);

  const [budgetModalOpen,setBudgetModalOpen]=useState(false);

  const {
    data: accounts=[],
    isLoading:accountsLoading,
    isRefetching:accountsRefetching,
    refetch:refetchAccounts,
  }=useAccountsQuery();

  const {
    data: transactions=[],
    isLoading:transactionsLoading,
    isRefetching:transactionsRefetching,
    refetch:refetchTransactions,
  }=useTransactionsQuery();

  const {
    data:budget=null,
    refetch:refetchBudget,
  }=useBudgetQuery();

  const loading =accountsLoading || transactionsLoading;
  const refreshing =accountsRefetching || transactionsRefetching;
  const greeting = getGreetings();

  //Methods:
  //Greetings
  function getGreetings() {
    const hour = new Date().getHours();

    if (hour < 12) {
      return { message: 'Good Morning', color: '#fda014' };
    }

    if (hour < 18) {
      return { message: 'Good Afternoon', color: '#fee859' };
    }

    return { message: 'Good Evening', color: '#92c0f5' };
  }
  //1. For Refreshing the things
  const onRefresh=()=>{
    refetchAccounts();
    refetchTransactions();
    refetchBudget();
  }

  //2. to cumulate the totalBalace
  const totalBalace= useMemo(
    ()=>accounts.reduce((sum,account)=>sum + account.balance,0)
    ,[accounts])

  //3. to cumulate the monthly transactions
  const monthlyTransactions = useMemo(
    ()=>{
      const now= new Date();
      return transactions.filter((tx)=>isSameMonth(new Date(tx.date),now))
    }
    ,[transactions]);

  const monthlyIncome = useMemo(
    ()=>
      monthlyTransactions
    .filter((tx)=>tx.type==="INCOME")
    .reduce((sum,tx)=> sum+tx.amount,0)
    ,[monthlyTransactions]
  );

  const monthlyExpense=useMemo(
    ()=>monthlyTransactions
    .filter((tx)=>tx.type==="EXPENSE")
    .reduce((sum,tx)=>sum+tx.amount,0)
    ,[monthlyTransactions]
  );

  const recentTransactions=useMemo(
    ()=> transactions.slice(0,5)
    ,[transactions]
  )

  const expenseBreakdown=useMemo(()=>{
      const map: Record<string,number>={};

      monthlyTransactions
        .filter((tx)=>tx.type==="EXPENSE")
        .forEach((tx)=>{
          map[tx.category]=(map[tx.category] ?? 0)+tx.amount;
        })

        return Object.entries(map)
                      .sort((a,b)=>b[1]-a[1])
                      .map(([category,amount])=>({
                        category:category as Transaction["category"],
                        amount,
                        color:getCategoryConfig(category as Transaction["category"]).color
                      }))
  },[monthlyTransactions])

  console.log("Total Balance:",totalBalace,"Monthly Transactions: ",monthlyTransactions)
  return (
    <SafeAreaView
      className="flex-1 bg-black"
      edges={["top"]}
    >
      <ScrollView
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
        }>
        <View className="bg-black rounded-b-[28px] px-5 pt-5 pb-[22px]">
          {/* Upper Section */}
          <View className="flex-row justify-between items-center mb-[22px]">
            <Image
              source={require("../../../../assets/images/edl-dt.png")}
              style={{width:80,height:"100%"}}
              resizeMode="contain"
            />
            <View className="flex-row items-center gap-2">
              <View className="items-end">
                <Text
                  className="text-zinc-400 font-semibold text-md"
                >{greeting.message}</Text>

                <Text
                  style={{ color: greeting.color }}
                  className="text-base font-medium text-xl italic"
                >
                  {user?.firstName ?? 'there'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(root)/(tabs)/profile")}
                className="w-[40px] h-[40px] rounded-full bg-[#1A1D26] items-center justify-center overflow-hidden ]"
                style={{
                      borderWidth: 1,
                      borderColor: getGreetings().color,
                }}
              >
                  { user?.imageUrl && user.hasImage?(
                    <Image
                      source={{uri:user.imageUrl}}
                      style={{width:40, height:40}}
                      resizeMode="cover"
                    />
                  ):(
                    <Feather name="user" size={18} color={getGreetings().color}/>
                  )}
              </TouchableOpacity>
            </View>
          </View>
          {/* personal info section */}
            <View className="mb-[20px]">

              <Text className="text-zinc-400 text-sm font-semibold mb-1">
                Total balance
              </Text>

              <Text className="text-white text-[34px] font-medium tracking-tight">
              {formatPrice(totalBalace,currency)}
              </Text>

              <View className="flex-row gap-3 mt-2">

                <View className="flex-row items-center gap-1.5">
                  <Feather name="arrow-up-right" size={14} color="#3DDC84" />
                  <Text className="text-[#3DDC84] text-[13px]">
                  {formatPrice(monthlyIncome, currency)}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1.5">
                  <Feather name="arrow-up-right" size={14} color="#FF6B4A" />
                  <Text className="text-[#FF6B4A] text-[13px]">
                  {formatPrice(monthlyExpense, currency)}
                  </Text>
                </View>
              </View>
            </View>

            {/* BUTTON SECTION */}
            <View className="flex-row gap-2.5">
              {QUICK_ACTIONS.map((act)=>(
                <TouchableOpacity 
                  key={act.label}
                  onPress={
                    ()=>router.push({
                        pathname:"/(root)/(tabs)/add-transaction",
                        params:{action:act.action}
                      })
                  }
                  activeOpacity={0.75}
                  className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-400 py-4 items-center gap-2"
                > 
                  <View
                    className="flex-1 w-9 h-9 rounded-full items-center justify-center"
                    style={{
                      backgroundColor:`${act.color}26`
                    }}
                  >
                     <Feather name={act.icon} size={17} color={act.color}/>
                  </View>
                  <Text className="text-zinc-400 text-[11px] font-medium text-medium">
                    {act.label}
                  </Text>

                </TouchableOpacity>
              ))}
            </View>
        </View>

        
        <View className="px-5 pt-[18px] pb-5">
          {/* AI search Button */}
              <TouchableOpacity
                onPress={()=> router.push("/(root)/(tabs)/assistant")}
                className="bg-white rounded-[18px] border border-[#E8E6DF] p-5 flex-row items-center gap-2 mb-[18px]">
                <View className="w-[26px] h-[26px] rounded-full bg-[#4A9EFF1A] items-center justify-center animate-ai-pulse-ring">
                  <View className="w-[7px] h-[7px] rounded-full bg-blue-700"/>
                </View>
                <Text className=" text-brand-text-muted text-[13px] flex-1">
                  Ask AI anything about your money
                </Text>
                <Feather name="arrow-right" size={16} color="#4A9EFF"/>{""}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBudgetModalOpen(true)}
                activeOpacity={0.85}
                className="bg-white rounded-[18px] border border-[#E8E6DF] p-4 mb-[18px]"
              >
                <View className="flex-row items-center justify-between mb-2.5">
                  <Text className="text-[#1A1D26] text-sm font-medium">
                    Monthly budget
                  </Text>
                  <Feather name="edit-2" size={13} color="#8A8D96" />
                </View>
                {budget?
                    (<>
                      <Text className="text-zinc-400 text-sm mb-2">
                        {formatPrice(monthlyExpense,currency)} of {" "}
                        {formatPrice(budget.amount,currency)} spent
                      </Text>

                      <View
                        className="h-2 rounded-full bg-zinc-300" overflow-hidden
                      >
                        <View
                          className="h-2 rounded-full"
                          style={{
                            width:`${Math.min(
                              Math.round((monthlyExpense/budget.amount)*100),
                              100,
                            )}%`,
                            backgroundColor:
                            monthlyExpense>=budget.amount
                            ?"#FF6B4A"
                            :monthlyExpense>budget.amount*0.8
                            ?"#F7DC6F":"#3DDC84"
                          }}
                        />
                      </View>
                    </>)
                    :(<Text className="text-zinc-400 text-sm">
                      Tap to set a monyhly spending budget
                    </Text>)
                  }
              </TouchableOpacity>

              {expenseBreakdown.length>0 && (
                <View className="bg-white border border-[#E8E6DF] p-4 rounded-[18px]">
                    <Text className="text-black text-md font-medium mb-3">Expense Breakdown (this month)</Text>
                   <View className="flex-row">
                       <PieChart
                        data={expenseBreakdown.map((c)=>({
                          value:c.amount,
                          color:c.color,
                        }))}
                        radius={60}
                        innerRadius={38}
                        innerCircleBorderColor="#fff"
                    />
                    <View className="flex-1 ml-4 gap-1.5">
                      {expenseBreakdown.slice(0,6).map((c)=>(
                        <View
                          key={c.category}
                          className="flex-row items-center justify-between"
                        >
                              <View className="flex-row gap-1 items-center">
                                    <View 
                                    className="w-2 h-2 rounded-full"
                                    style={{backgroundColor:c.color}}
                                    />
                                    <Text className="text-zinc-800 text-[11px]">
                                        {getCategoryConfig(c.category).label}
                                    </Text>
                                
                              </View>
                              <Text className="text-zinc-700 text-[11px] font-bold italic">
                                {formatPrice(c.amount,currency)}
                              </Text>
                            </View>
                      ))}
                    </View>
                   </View>
                </View>
              )}
              {/* Reecent Transactions */}
              <View className="flex-row justify-between items-center my-3">
                <Text className="text-[#1A1D26] text-sm font-medium">
                  Recent Transactions
                </Text>
                <TouchableOpacity
                  onPress={()=> router.push("/(root)/(tabs)/transactions")}
                >
                  <Text className="text-zinc-400 text-xs">See all</Text>
                </TouchableOpacity>
              </View>

              {loading ?
                <View className="items-center py-6">
                  <ActivityIndicator color="#4A9EFF"/>
                </View>
                : recentTransactions.length===0?(
                  <View className=" justify-center items-center py-6">
                    <Feather name="inbox" size={28} color={"#BDC3C7"}/>
                    <Text className="text-zinc-400 text-muted text-sm mt-3">
                      No transactions yet
                    </Text>
                  </View>
                ):(
                  recentTransactions.map((tx)=>(<TransactionRow key={tx.id} tx={tx}/>))
                )
              }
        </View>
      </ScrollView>
      {user && 
      <BudgetModal
        visible={budgetModalOpen}
        budget={budget}
        onClose={()=> setBudgetModalOpen(false)}
        onSaved={()=> setBudgetModalOpen(false)}
      />}
    </SafeAreaView>
  )
}
