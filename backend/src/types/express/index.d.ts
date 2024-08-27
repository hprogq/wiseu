declare global {
    namespace Express {
        interface Request {
            user?: { user_id: string; username: string; roles: string[] };
        }
    }
}

export {};