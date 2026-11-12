import {z} from "zod";

export const signUpSchema = z.object({
    firstName:z.string().trim().min(1,"First name is required."),
    lastName:z.string().trim().min(1,"Last Name is required."),
    email:z.email("Enter a valid Email").trim().min(4,"Email is required"),
    password:z.string().min(8,"Password must be 8 characters or more.")
})


export const signInSchema = z.object({
    email:z.email("Enter a valid email").trim().min(4,"Email is required"),
    password:z.string().trim().min(1,"Password is required")
})

export const codeSchema =z.object({
    code:z.string().trim().min(1,"Enter the Varification code"),
})

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type CodeFormValues = z.infer<typeof codeSchema>;
