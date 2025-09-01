
/**
 * ```
 * Req body will receive the user id after authentication checking
 * And also any other request body type can be included
 * ```
 */
export type AuthenticatedRequestBody<T> = T & {
    userId: string
}