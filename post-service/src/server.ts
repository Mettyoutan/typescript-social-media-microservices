import 'dotenv/config';
import express from 'express';
import { logger } from "./utils/logger.utils";
import { pool } from './db/pg.db';
import { errorHandler } from "./middlleware/error.handler";
import postRoutes from "./routes/post.routes";

const server = express();

// DB is executed on [post-service/src/db/pg.db.ts]
pool.on('connect', () => logger.info('PostgreSQL DB connected'));

server.use(express.json());

server.use('/api/post', postRoutes);

server.listen(process.env.PORT, () =>
    logger.info(`Server listening on port ${process.env.PORT}`)
);

server.use(errorHandler);