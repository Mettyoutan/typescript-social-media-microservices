import cors from 'cors';

const originList = ['http://localhost:3000', 'http://localhost:3001'];

export const corsMiddleware = cors({
    credentials: true, // enabling cookie
    origin: (origin, callback) => {
        if (!origin || originList.indexOf(origin) === -1) {
            callback(null, false);
        }
        callback(null, true);
    },

})