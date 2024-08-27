import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
            if (err) {
                return res.status(403).json({ success: false, message: 'Invalid token', data: null });
            }

            req.user = user;
            next();
        });
    } else {
        return res.status(401).json({ success: false, message: 'Unauthorized', data: null });
    }
};
