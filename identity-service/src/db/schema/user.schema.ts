import * as t from 'drizzle-orm/pg-core';
import {gt, lt, relations, sql} from "drizzle-orm";
import * as z from 'zod';
import {timestamp} from './timestamp-table.schema.js';
import {refreshTokens} from "./refresh-token.schema.js";

/**
 * @model user
 */

export const users = t.pgTable('users',
    {
        id: t.uuid('id').primaryKey().notNull(), // need to manually add the id value
        username: t.text('username').notNull(),
        email: t.text('email').notNull().unique(),
        password: t.text('password').notNull(),
        ...timestamp,
    },
    (table) => [
        // check constraints for email lowercase
        t.check('user_email_lowercase_check', sql`${table.email} = LOWER(${table.email})`),
        t.index('user_email_index').on(table.email) // create an index on email column
    ]
);

export const userRelations = relations(
    users, ({one, many}) => ({
    refreshToken: one(refreshTokens)
}))
