import { defineConfig } from 'drizzle-kit';

const schemaPath = './dist/db/schema';

export default defineConfig({
    dialect: "postgresql",
    schema: [`${schemaPath}/post.schema.js`],
    out: "./drizzle",

    casing: "snake_case",
    strict: true,
    verbose: true,

    dbCredentials: {
        url: process.env.DATABASE_URL!
    },

    migrations: {
        table: '__drizzle_migrations__',
        schema: 'public',
        prefix: 'timestamp'
    }
})