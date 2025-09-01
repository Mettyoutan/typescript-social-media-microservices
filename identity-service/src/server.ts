import 'dotenv/config';
import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { logger } from "./utils/logger.utils.js";
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { errorHandler, HttpError } from "./middleware/error.handler.js";
import { rateLimit } from 'express-rate-limit';
import RedisStore, { type RedisReply } from "rate-limit-redis";
import { register, login, refreshToken, logout } from './controllers/auth.controller.js'

const server: Express = express();

/**
 * ```
 * Node postgres pool instance
 * ```
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL as string
});
pool.on('connect', () => console.log('PostgreSQL DB connected'));


/**
 * ```
 * Drizzle client connection using pg pool
 * ```
 */
export const db = drizzle(pool);


server.use(express.json());
server.use(cors({
    origin: ['http://localhost:3001', "http://localhost:3000"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
server.use(helmet());
server.use(cookieParser(process.env.COOKIE_SECRET_KEY as string));
server.disable('x-powered-by');


/**
 * ```
 * Redis client instance: rate limit
 * Db: 0
 * ```
 */
const rateLimitClient = new Redis(process.env.REDIS_RATE_LIMIT_URL as string, {
    retryStrategy: (times) => Math.min(times * 100, 5000),
    maxRetriesPerRequest: 3
});
rateLimitClient.on('connect', () => console.log('Redis Client connected'));


/**
 * ```
 *  Ip limiter middleware for global endpoints (10 requests/sec)
 *  ```
 */
const ipLimiterMiddleware = rateLimitClient.status === 'connect'
    ? new RateLimiterRedis({
    storeClient: rateLimitClient,
    keyPrefix: 'global_ip_redis_rl',
    points: 10, // max 10 requests (600 points / minute)
    duration: 1, // each second
    blockDuration: 30, // 30 seconds
})
    : new RateLimiterMemory({
    keyPrefix: 'global_ip_memory_rl',
    points: 10,
    duration: 1,
    blockDuration: 30
})


server.use(async(req: Request, res: Response, next: NextFunction) => {
    try {
        await ipLimiterMiddleware.consume(req.ip as string, 1);
        next();
    } catch (e) {
        if (e instanceof Error) {
            logger.error('Rate limiter error', e);
            next(e);
        }

        logger.warn(`Rate limit exceeded for IP ${req.ip}`);
        // res.status(429).json({
        //     success: false,
        //     message: 'Too many requests',
        //     retryAfter: 30 + ' seconds'
        // })
        next(e);
    }
});


/**
 * ```
 * Sensitive ip rate-limiter for sensitive endpoints
 * - login
 * - register
 * - refresh token
 * ```
 */
const sensitiveIpLimiterMiddleware = rateLimit({
    windowMs:  60000,
    limit: 5, // 5 requests/min
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (command, ...args) =>
            rateLimitClient.call(command, args) as Promise<RedisReply>
    }),
    handler: (req: Request, res: Response, next: NextFunction) => {
        logger.warn('Sensitive rate limit exceeded for IP', req.ip);
        // res.status(429).send('Too many requests');
        next(new HttpError('Too many requests', 429));
    }
})


/**
 * ```
 * Sensitive account rate limiter for sensitive endpoints
 * - login
 * - register
 * - refresh token
 * ```
 */
const sensitiveAccountLimiter= rateLimitClient.status === 'connect'
    ? new RateLimiterRedis({
        storeClient: rateLimitClient,
        keyPrefix: 'account_redis_rl',
        points: 5, // max 5 attempts
        duration: 2 * 60, // per 2 minutes
        blockDuration: 5 * 60 // block 5 minutes
    })
    : new RateLimiterMemory({
        keyPrefix: 'account_memory_rl',
        points: 5,
        duration: 2 * 60,
        blockDuration: 5 * 60
    });


function registerLoginLimiter() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await sensitiveAccountLimiter.consume(req.body.email! as string);
            next();
        } catch (e) {
            logger.error(`Rate limiter exceeded for sensitive endpoint for user with ip ${req.ip}`, e);
            next(e);
        }
    }
}
function refreshTokenLimiter() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await sensitiveAccountLimiter.consume(req.signedCookies.refreshToken as string);
            next();
        } catch (e) {
            logger.error(`Rate limiter exceeded for 
            sensitive endpoint for user with refresh token ${req.signedCookies.refreshToken as string}`, e);
            next(e);
        }
    }
}
    
// Logic auth endpoints
server.use('/api/auth/register', sensitiveIpLimiterMiddleware, registerLoginLimiter(), register);
server.use('/api/auth/login', sensitiveIpLimiterMiddleware, registerLoginLimiter(), login);
server.use('/api/auth/refresh', sensitiveIpLimiterMiddleware, refreshTokenLimiter(), refreshToken);
server.use('/api/auth/logout', sensitiveIpLimiterMiddleware, logout);


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// cleanup on shutdown
process.on('SIGTERM', async() => await pool.end());

// log our unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at', promise[Symbol.toStringTag], reason);
})

// error handler
server.use(errorHandler);