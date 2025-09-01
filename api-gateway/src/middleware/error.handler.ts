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

// create error handler middleware for express (with HttpError instance)
export function errorHandler(e: Error, req: Request, res: Response, next: NextFunction): Response {

    if (res.headersSent) next(e);


    if (e instanceof ZodError) {
        logger.error(e.stack);
        return res.status(400).json({
            success: false,
            message: 'ZodError occurred',
            error: e.message
        })
    }

    if (e instanceof HttpError) {
        logger.error(e.stack);
        e.statusCode = e.statusCode || 500;
        return res.status(e.statusCode).json({
            success: false,
            message: 'HttpError occurred',
            error: e.message,
        })
    }

    logger.error(e.stack);
    return res.status(500).json({
        success: false,
        error: e.message
    })

}