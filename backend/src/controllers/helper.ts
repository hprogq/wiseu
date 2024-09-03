import { Request, Response } from 'express';
import { createResponse } from "../utils/responseHelper";
import User from '../models/User';
import {translate} from "../utils/translate"; // 引入User模型

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
        if (req.session.user) {
            const userId = req.session.user?.id;

            // 检查用户在数据库中是否存在且有效
            User.findById(userId).then(user => {
                if (user && user.active) {
                    return handlers[method](req, res);
                } else {
                    req.session.destroy(function() {
                        return res.status(401).json(createResponse(false, 'Unauthorized'));
                    });
                }
            }).catch(() => {
                return res.status(500).json(createResponse(false, 'Internal Server Error'));
            });
        } else {
            return res.status(401).json(createResponse(false, 'Unauthorized'));
        }
    } else {
        handlers[method](req, res);
    }
};

export default restful;
