import 'dotenv/config';
import {defineConfig} from 'drizzle-kit';

// using the compiled js schema
const schemaPath = './dist/db/schema';

// define the drizzle-kit config for migration
export default defineConfig({
    dialect: "postgresql",
    schema: [`${schemaPath}/user.schema.js`, `${schemaPath}/refresh-token.schema.js`], // schema folder
    out: './drizzle',

    // driver: 'pglite',
    dbCredentials: {
        url: process.env.DATABASE_URL
    },

    migrations: {
        table: '__drizzle_migrations__',
        schema: 'public',
        prefix: 'timestamp'
    },

    verbose: true,
    strict: true,
    breakpoints: true,
    introspect: {casing: "camel"}
})