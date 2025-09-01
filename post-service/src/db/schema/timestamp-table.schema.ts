import {timestamp as t, } from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";

export const timestamp = {
    createdAt: t('created_at', {mode: "date"}).defaultNow(), // give the new Date constructor
    updatedAt: t('updated_at', {mode: "date"}).defaultNow().$onUpdateFn(() => new Date())
}