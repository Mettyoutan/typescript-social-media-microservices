// Custom auth model types
import * as z from "zod";

/**
 * ### Authentication input validation
 * ```
 * Must be updated everytime the db schema changes
 * identity-service/src/db/schema/user.schema.ts
 * ```
 */

const registerInput = z.object({
    username: z.string().min(0).max(150).trim(),
    email: z.email().min(0).max(150).toLowerCase().trim(),
    password: z.string().min(3).max(150)
})

const loginInput = z.object({
    email: z.email().min(0).max(150).toLowerCase().trim(),
    password: z.string().min(3).max(150)
})

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;

export async function validateRegisterInput(input: RegisterInput) {
    try {
        return await registerInput.parseAsync(input);
    } catch (e) {
        throw e;
    }
}

export async function validateLoginInput(input: LoginInput) {
    try {
        return await loginInput.parseAsync(input);
    } catch (e) {
        throw e;
    }
}