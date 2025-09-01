import * as t from 'drizzle-orm/pg-core';
import {users} from './user.schema.js';
import {relations, sql} from "drizzle-orm";

export const refreshTokens = t.pgTable('refresh_tokens', {
    id: t.text('id').primaryKey().notNull(),
    accessToken: t.text('access_token').unique().notNull(),
    userId: t.uuid().references(() => users.id).notNull().unique(),
    expiresIn: t.timestamp('expires_in').default(sql`NOW() + INTERVAL '7 days'`),
    createdAt: t.timestamp('created_at').defaultNow(),
}, (table) => [
    t.index('refresh_token_expires_in_index')
        .on(table.expiresIn), // create an index on expiresIn column
])


export const refreshTokenRelations = relations(
    refreshTokens, ({one, many}) => ({
        user: one(users, {
            fields: [refreshTokens.userId],
            references: [users.id],
        }), // related to user table
    })
)