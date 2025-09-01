import 'dotenv/config';
import express, {Request, Response, NextFunction} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import proxy from 'express-http-proxy';
import { Redis } from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { logger } from './utils/logger.utils';
import { errorHandler } from './middleware/error.handler'

const server = express();

server.use(express.json());
server.use(cors());
server.use(helmet());


/**
 * ```
 * Redis client
 * ```
 */
const redisClient = new Redis(process.env.REDIS_URL as string, {
    retryStrategy: (times: number) => Math.min(times * 100, 5000),
    maxRetriesPerRequest: 3
});
redisClient.on('connect', () => logger.info('Redis Client Connected'));


/**
 * ```
 * Redis IP rate limiter (100 requests / 15 minutes)
 * ```
 */
const ipRateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'api-gateway-rl',
    points: 100,
    duration: 15 * 60, // max 100 requests / 15 minutes
})

// IP RATE LIMITER MIDDLEWARE
server.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ipRateLimiter.consume(req.ip!, 1);
        next()
    } catch (e) {
        logger.warn(`Rate limit exceeded for user with ip ${req.ip!} =>`, e)
        next(e)
    }
})


// CREATE A MIDDLEWARE TO LOG EVERY INCOMING REQUEST
server.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Received ${req.method} request to ${req.url}`);
    // logger.debug('Request body', req.body);
    next();
})


const proxyOptions = {
    // MANIPULATE THE URL PATH (/v1/.. -> /api/..)
    proxyReqPathResolver: (req: Request) => {
        return req.originalUrl.replace(/^\/v1/, "/api")
    },
    proxyErrorHandler: (err: Error, res: Response, next: NextFunction) => {
        logger.error('Something error on proxy', err);
        next(err);
    }
}


// ROUTES THE REQUEST INTO IDENTITY SERVICE HOST ENDPOINTS
server.use('/v1/auth', proxy( process.env.IDENTITY_SERVICE_URL! , {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq: Request) => {
        proxyReqOpts.headers["content-type"] = "application/json"
        return proxyReqOpts; // return the modified headers
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.debug(`Respond receive from identity service [${proxyRes.statusCode}]`);
        return proxyResData;
    }
}))

/**
 * api-gateway      ->  /v1/auth/x      -> 3000
 * identity-service ->  /api/auth/x     -> 3001
 */

server.use(errorHandler);

server.listen(process.env.PORT!, () => {
    logger.info(`API gateway is running on port ${process.env.PORT!}`);
    logger.info(`Identity service is running on URL ${process.env.IDENTITY_SERVICE_URL!}`);
    logger.info(`Post service is running on URL ${process.env.POST_SERVICE_PORT!}`);
    logger.info(`Redis URL ${process.env.REDIS_URL!}`);
});