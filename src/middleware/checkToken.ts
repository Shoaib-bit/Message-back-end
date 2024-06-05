import jwt, { VerifyErrors } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET =  process.env.JWT_KEY?? 'default';

interface UserPayload {
  _id: string;
  email: string;
  userType: string; // Optional field
}

// Extend Express Request interface to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const checkToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.header('Authorization');
    if (!token) {
      res.status(401).json({ message: 'Authorization token missing' });
      return;
    } 
    jwt.verify(token.replace('Bearer ', ''), JWT_SECRET as string, (err: any, user: any) => {
        if (err) {
            return res.status(400).send('You are not Authorized');
        }
        req.body.user = user;
        next()
    });
};
  
