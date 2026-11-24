import { z } from "zod";
import { CategoryKey } from "../../constants/categories";

export const transactionSchema=z.object({
    type:z.enum(["EXPENSE","INCOME"]),
    amount:z.string()
    .min(1,"Enter an Amount.")
    .refine((v)=>{
        const parsed=parseFloat(v.replace(/,/g,""));
        return !Number.isNaN(parsed) && parsed>0;
    },"Enter a valid amount."),
    category:z.custom<CategoryKey>((v)=>typeof v==="string"),
    accountId:z.custom<string>((v)=> typeof v === "string")
    .refine((v)=>v.length>0,"Select an account."),
    description:z.string().optional(),
    date:z.date(),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>;