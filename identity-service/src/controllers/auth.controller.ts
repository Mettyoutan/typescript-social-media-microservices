import { logger } from "../utils/logger.utils.js";
import type { Request, Response, NextFunction, CookieOptions } from 'express';
import { validateRegisterInput, type LoginInput, type RegisterInput, validateLoginInput } from "../types/auth.types.js";
import { HttpError } from "../middleware/error.handler.js";
import {and, eq, gt, lt, or} from "drizzle-orm";
import { users } from "../db/schema/user.schema.js";
import { db } from "../server.js"
import {argon2id, hash, verify} from "argon2";
import { v7 } from "uuid";
import {generateToken} from "../utils/generate-token.utils.js";
import {refreshTokens} from "../db/schema/refresh-token.schema.js";

const refreshTokenCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    signed: true,
};
const userInfo = {
    id: users.id,
    username: users.username,
    email: users.email,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
}


export async function register(req: Request<{}, {}, RegisterInput>, res: Response, next: NextFunction) {
    try {
        logger.info('User is doing registration');
        const {username, email, password}: RegisterInput = await validateRegisterInput(req.body);

        // check if the user already exists
        const [userRecord] = await db.select().from(users).where(or(
            eq(users.username, username),
            eq(users.email, email)
        )).limit(1);

        if (userRecord)
            throw new HttpError('User is already existing', 409);

        // hash the password
        const hashedPassword = await hash(password, {type: argon2id});

        await db.transaction(async (tx) => {
            const [userRecord] = await tx.insert(users).values({
                id: v7(), username, email, password: hashedPassword
            }).returning(userInfo);

            // Throw an error that automatically rollback the transaction
            if (!userRecord) throw new HttpError('Something went wrong', 500);
        }, {
            isolationLevel: "read committed",
            accessMode: "read write",
            deferrable: true,
        });

        logger.info('User registered successfully.');

        res.status(201).json({
            success: true,
            message: `User registered successfully. Please login.`,
            data: {}
        });

    } catch (e) {
        logger.warn('Error occurred while registering user', e);
        next(e);
    }
}

export async function login(req: Request<{}, {}, LoginInput>, res: Response, next: NextFunction) {
    try {
        logger.info('User is doing login');
        const {email, password}: LoginInput = await validateLoginInput(req.body);

        // check if the refresh token on cookie exists
        if (req.signedCookies.refreshToken) {
            throw new HttpError('Refresh token is still available', 409)
        }

        /**
         * - check if the user with email exists
         * - check if the user's refresh token still exists and valid
         */
        const [ result ] = await db.select().from(users)
                .where(eq(users.email, email))
                .leftJoin(refreshTokens, eq(users.id, refreshTokens.userId)).limit(1);
                // use left join

        if (!result || !result.users) throw new HttpError(`Could not find user by email '${email}' on login`, 404);

        // if somehow, the session is still valid / when cookies not valid
        if (result.refresh_tokens) {
            // invalidate the session
            await db.delete(refreshTokens).where(eq(refreshTokens.userId, result.users.id))
        }

        // check if the password not matches
        const isPasswordMatches = await verify(result.users.password, password);
        if (!isPasswordMatches) throw new HttpError('Password does not match', 403);

        // give authorization token
        const { newAccessToken, newRefreshToken } = await generateToken(result.users.id);

        // save refresh token to db
        await db.transaction(async (tx) => {
            await tx.insert(refreshTokens).values({
                id: newRefreshToken,
                accessToken: newAccessToken,
                userId: result.users.id
            })
        })
        logger.info('User logged in successfully');

        res.cookie('refreshToken', newRefreshToken, refreshTokenCookieOptions);

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            data: {
                accessToken: newAccessToken
            } // only pass access token to the client
        })

    } catch (e) {
        logger.warn('Error occurred while logging user', e);
        next(e);
    }
}

export async function refreshToken(req: Request<{}, {}, {refreshToken: string}>, res: Response, next: NextFunction) {
    try {
        logger.info('User is doing refresh token');

        // get the refresh token from signed cookie
        const oldRefreshToken: string = req.signedCookies.refreshToken;
        if (!oldRefreshToken) throw new HttpError('Could not find refresh token', 404);

        // check if the refresh token still valid
        const [refreshTokenRecord] = await db.select().from(refreshTokens).where(and(
            eq(refreshTokens.id, oldRefreshToken),
            gt(refreshTokens.expiresIn, new Date()) // check if expiration still gt now
        )).limit(1);

        if (!refreshTokenRecord)
            throw new HttpError('Invalid refresh token', 403);

        /**
         * Generate new access token if refresh token cookie and session still valid
         */
        const { newAccessToken } = await generateToken(refreshTokenRecord.id);
        logger.info('Successfully get new access token');

        res.status(200).json({
            success: true,
            message: 'Get new access token',
            data: {
                accessToken: newAccessToken
            }
        })

    } catch (e) {
        logger.warn('Error occurred while refreshing token', e);
        next(e);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        logger.info('User is doing logout');

        // revoke the token from cookies and db
        const refreshToken: string = req.signedCookies.refreshToken;
        if (!refreshToken) throw new HttpError('Could not find refresh token', 404);

        await db.delete(refreshTokens).where(eq(refreshTokens.id, refreshToken));
        logger.info('Successfully logout');

        // clear the existing refresh token on cookies
        res.clearCookie('refreshToken', refreshTokenCookieOptions);

        res.status(200).json({
            success: true,
            message: 'Logout successfully',
            data: {}
        })

    } catch (e) {
        logger.warn('Error occurred while trying to logout the user', e);
        next(e)
    }
}

