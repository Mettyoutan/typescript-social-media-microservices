import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import { HttpError } from "./error.handler";
import { jwtVerify } from 'jose';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {

    const header = 'x-user-id';

    const accessKey = new TextEncoder().encode(process.env.JWT_ACCESS_TOKEN_SECRET_KEY!);

    try {
        // CHECK THE EXISTING AUTH TOKEN
        const token = req.headers.authorization?.split(' ')[1];

        // IF NO TOKEN PROVIDED, PASS UNDEFINED to x-user-id
        if (!token) {
            req.headers[header] = undefined;
            return next();
        }

        // IF PROVIDED, VERIFY
        const { payload } = await jwtVerify(token, accessKey)

        // PASS THE USER ID TO x-user-id
        req.headers[header] = payload.userId as string;

        return next();
    } catch (e) {
        next(e)
    }

}