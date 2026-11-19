import { useUser } from "@clerk/expo";
import { useSupabase } from "../useSupabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query/keys";
import { deleteTransaction, getTransactions, Transaction, TransactionFilters, TransactionType } from "../../lib/services/transactions.services";
import { getBudget, upsertBudget } from "../../lib/services/budgets.services";

export function useDeleteTransaction(){
    const supabase = useSupabase();
    const queryClient = useQueryClient();


    return useMutation({
        mutationFn:(tx:Pick<Transaction,"id" | "account_id" | "amount" | "type">,)=> deleteTransaction(
            supabase,
            tx.id,
            tx.account_id,
            tx.amount,
            tx.type as TransactionType,
        ),
        onSuccess: (result)=>{
            queryClient.invalidateQueries({queryKey:["transactions"]});
            queryClient.invalidateQueries({queryKey:["accounts"]})
        }
    });

}