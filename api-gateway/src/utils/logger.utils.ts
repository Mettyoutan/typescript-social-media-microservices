import 'dotenv/config.js';
import * as w from 'winston';

// create and generate a loggerHelper
export const logger = w.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info': 'debug', // level of our loggerHelper
    format: w.format.combine(
        w.format.timestamp(),
        w.format.errors({stack: true}),
        w.format.splat(),
        w.format.json()
    ),
    defaultMeta: {service: 'api-gateway'}, // information for our loggerHelper,
    transports: [
        new w.transports.Console({
            format: w.format.combine(
                w.format.colorize(),
                w.format.simple()
            )
        }),

        new w.transports.File({
            level: 'error',
            dirname: 'logs',
            filename: 'error.log'
        })
    ]
})