import { CATEGORY_KEYS_EXPENSE, CATEGORY_KEYS_INCOME, CategoryKey } from "../../../constants/categories";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_TRANSIENT_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export type ExtractedTransaction={
    type : "EXPENSE" |"INCOME"|null;
    amount:number|null;
    category:CategoryKey|null;
    description:string | null;
    date:string | null;
    transcript:string | null;
}

const RESPONSE_SCHEMA={
    type:"object",
    properties:{
        type:{type:"string",enum:["EXPENSE","INCOME"],nullable:true},
        amount:{type:"number",nullable:true},
        category:{
            type:"string",
            enum:[...CATEGORY_KEYS_EXPENSE,...CATEGORY_KEYS_INCOME],
            nullable:true
        },
        description:{type:"string",nullable:true},
        date:{type:"string",nullable:true},
        transcript:{type:"string",nullable:true},
    },
    required:["type","amount","category","description","date","transcript"],
};

async function callGemini(promptText:string,inlineData:{mimeType:string,data:string}) {
    const apiKey=process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if(!apiKey) throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        for (let attempt = 0; ; attempt++) {
            const res = await fetch(`${GEMINI_URL}?key=${apiKey}`,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                signal:controller.signal,
                body:JSON.stringify({
                    contents:[
                        {
                            role:"user",
                            parts:[{text:promptText},{inlineData}],
                        },
                    ],
                    generationConfig:{
                        responseMimeType:"application/json",
                        responseSchema:RESPONSE_SCHEMA
                    }
                })
            });

            if(!res.ok){
                const errText=await res.text();
                if (RETRYABLE_STATUS_CODES.has(res.status) && attempt < MAX_TRANSIENT_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1_000 * 2 ** attempt));
                    continue;
                }
                throw new Error(`Gemini request failed: ${errText}`);
            }

            const data=await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if(!text) throw new Error("No response from gemini");
            return JSON.parse(text) as ExtractedTransaction;
        }
    } catch (error) {
        if(controller.signal.aborted){
            throw new Error("Gemini request timed out after 45 seconds. Please try again.");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function extractTransactionFromReceipt(base64Image:string,mimeType:string):Promise<ExtractedTransaction> {
    const prompt =`You are reading a receipt photo for a personal finance
                    app. Extract the transaction details.

                    "type" is always "EXPENSE" for a receipt.
                    -"amount" is the final total paid (a plain number, no currency symbols).
                    - "category" must be exactly one of: ${CATEGORY_KEYS_EXPENSE.join(", ")}.
                    - "description" is a short label, ideally the merchant/store name.
                    - "date" is the receipt date in YYYY-MM-DD format, if visible.
                    - "transcript" should be null.
                    - If any field can't be confidently determined from the image, set it to
                    null. Do not guess .`;
    return callGemini(prompt,{mimeType,data:base64Image})                
}

export async function extractTransactionFromVoice(base64Audio:string,mimeType:string):Promise<ExtractedTransaction> {
    const today =new Date().toISOString().slice(0,10);
    const prompt = `You are transcribing a short voice note for a personal
                finance app where the user is logging a transaction (e.g. "I spent 400
                on groceries yesterday" or "Got 5000 rupees freelance payment today").
                Today's date is ${today}. Extract the transaction details.

                "type" is "EXPENSE" or "INCOME" based on what the user said.
                - "amount" is the amount mentioned (a plain number, no currency symbols).
                - "category" must be exactly one of: ${CATEGORY_KEYS_EXPENSE.join(", ")}, ${CATEGORY_KEYS_INCOME.join(", ")} (pick from the expense list if type is
                EXPENSE, income list if INCOME).
                - "description" is a short label summarizing what it was for.
                - "date" should be null unless the user clearly mentioned a specific date
                (e.g. "yesterday", "on Monday") - resolve relative dates to YYYY-MM-DD
                using ${today} as today's date.
                - "transcript" is the verbatim transcription of what was said.
                - If any field can't be confidently determined, set it to null. Do not
                guess .`;

        return callGemini(prompt,{mimeType,data:base64Audio})
}