import * as z from 'zod';
import {logger} from "../utils/logger.utils";


const postInput = z.object({
    content: z.string().nonempty().max(250).trim(),
    mediaIds: z.array(z.string()).default([]),
})


/**
 *
 * ```
 * {
 *     content: string,
 *     mediaIds: string[] or [empty]
 * }
 * ```
 */
export type PostInput = z.infer<typeof postInput>;

export async function validatePostInput(input: PostInput) {
    try {
        return await postInput.parseAsync(input);
    } catch (e) {
       logger.warn(`Unable to validate post input: ${input}`);
       throw e;
    }

}