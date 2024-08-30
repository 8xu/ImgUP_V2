import type { Request, Response } from "express";

export default async (req: Request, res: Response, next: Function) => {
    const token = req.headers.token as string;

    console.log(req.headers);

    // console.log(token);
   
    if (!token) {
        res.status(401).json({
            error: 'Unauthorized',
        });

        return;
    }

    const workingToken = 'test123';

    if (token !== workingToken) {
        res.status(403).json({
            error: 'Forbidden',
        });

        return;
    }

    next();
};