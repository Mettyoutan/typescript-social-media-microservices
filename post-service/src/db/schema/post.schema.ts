import * as t from 'drizzle-orm/pg-core'
import { timestamp } from './timestamp-table.schema'

/**
 * ### Posts Table
 * ```
 * { id: string, userId: string, content: string, mediaIds?: string, [timestamp] }
 * ```
 */
export const posts = t.pgTable('posts', {
    id: t.text('id').primaryKey().notNull(), // NEED TO MANUALLY GENERATE UUID V7
    userId: t.text('user').notNull(), // NO NEED TO REFERENCE THE USERS TABLE
    content: t.text('content').notNull(),
    mediaIds: t.text('media_urls').array().notNull().$defaultFn(() => new Array<string>()),
    ...timestamp

}, (table) => [
    // INDEX FOR CONTENT SEARCH
    t.index('content_index').on(table.content)
]);






