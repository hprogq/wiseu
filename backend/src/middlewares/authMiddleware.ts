import { Request, Response, NextFunction } from 'express';

export const authenticateSession = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.user) {
        next();
    } else {
        return res.status(401).json({ success: false, message: 'Unauthorized', data: null });
    }
};
