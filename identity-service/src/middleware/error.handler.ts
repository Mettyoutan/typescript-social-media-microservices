import {logger} from "../utils/logger.utils.js";

// create a new HttpError class with additional properties of [statusCode]
import type {Request, Response, NextFunction} from "express";
import {ZodError} from "zod";

export class HttpError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode
    }
}

// create an async handler function that automatically handles the controller's error, then pass it to the error handler middleware
// export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>)
//     : (req: Request, res: Response, next: NextFunction) => void {
//     return function(req: Request, res: Response, next: NextFunction) {
//         Promise.resolve(fn(req, res)).catch(next);
//     }
// }

// create error handler middleware for express (with HttpError instance)
export function errorHandler(e: Error, req: Request, res: Response, next: NextFunction) {

    if (res.headersSent) next(e);


    if (e instanceof ZodError) {
        logger.error(e.stack);
        return res.status(400).json({
            success: false,
            error: 'ZodError occurred',
            message: e.message
        })
    }

    if (e instanceof HttpError) {
        logger.error(e.stack);
        e.statusCode = e.statusCode || 500;
        return res.status(e.statusCode).json({
            success: false,
            error: 'HttpError occurred',
            message: e.message,
        })
    }

    logger.error(e.stack);
    return res.status(500).json({
        success: false,
        error: e.message
    })

}