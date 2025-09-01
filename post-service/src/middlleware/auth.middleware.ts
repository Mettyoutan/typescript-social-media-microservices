import 'dotenv/config';
import {jwtVerify} from 'jose';
import { Request, Response, NextFunction } from 'express';
import { HttpError } from "./error.handler";
import { logger } from "../utils/logger.utils";

/**
 *  #### Auth Middleware
 *  @description
 *  ```
 *  The API gateway will send the x-user-id if the user is authenticated
 *
 *  Check if the user id is available or not
 *  ```
 */

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    logger.debug(`Checking user's credentials...`);

    try {

        // GET THE ACCESS TOKEN FROM req.headers[authorization]
        const userId = req.headers['x-user-id'];

        if (!userId || !userId.length) {
            logger.warn('No user id provided');
            throw new HttpError('Authentication required', 401);
        }

        // ADD THE userId  --> req.body.userId
        req.body.userId = userId;

        next();

    } catch (e) {
        logger.warn('User is not authenticated. No user id provided!', e);
        next(e);
    }



}