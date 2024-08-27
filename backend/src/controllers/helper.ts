import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import {createResponse} from "../utils/responseHelper";

const restful = (
    req: Request,
    res: Response,
    handlers: {
        [key: string]: (req: Request, res: Response) => void
    },
    authenticate: boolean = false
) => {
    const method = req.method.toLowerCase();

    if (!(method in handlers)) {
        res.set('Allow', Object.keys(handlers).join(', ').toUpperCase());
        return res.status(405).send(createResponse(false, `Request Method "${req.method}" Not Allowed`));
    }

    if (authenticate) {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const token = authHeader.split(' ')[1];

            jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
                if (err) {
                    return res.status(403).json(createResponse(false, 'Invalid Token'));
                }

                req.user = user;
                return handlers[method](req, res);
            });
        } else {
            return res.status(401).json(createResponse(false, 'Unauthorized'));
        }
    } else {
        handlers[method](req, res);
    }
};

export default restful;