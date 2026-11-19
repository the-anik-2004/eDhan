import { useUser } from "@clerk/expo";
import { useSupabase } from "../useSupabase";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query/keys";
import { getTransactions, TransactionFilters } from "../../lib/services/transactions.services";
import { getBudget } from "../../lib/services/budgets.services";

export function useBudgetQuery(filters:TransactionFilters={}){
    const {user} =useUser();
    const supabase = useSupabase();

    return useQuery({
        queryKey:queryKeys.budget(user?.id),
        queryFn:()=> getBudget(supabase,user!.id),
        enabled: !!user,
    });

}