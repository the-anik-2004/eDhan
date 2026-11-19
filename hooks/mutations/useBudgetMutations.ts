import { useUser } from "@clerk/expo";
import { useSupabase } from "../useSupabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query/keys";
import { getTransactions, TransactionFilters } from "../../lib/services/transactions.services";
import { getBudget, upsertBudget } from "../../lib/services/budgets.services";

export function useUpsertBudget(filters:TransactionFilters={}){
    const {user} =useUser();
    const supabase = useSupabase();
    const queryClient = useQueryClient();


    return useMutation({
        mutationFn:(amount:number)=> upsertBudget(supabase,user!.id,amount),
        onSuccess: ()=>{
            queryClient.invalidateQueries({
                queryKey:["budget"]
            });
        }
    });

}