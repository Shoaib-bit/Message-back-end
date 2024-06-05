import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET =  process.env.JWT_KEY?? 'default';

interface UserPayload {
  _id: string;
  email: string;
  userType : string; // Optional field
}

export function generateJWT(userPayload: UserPayload): string {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '100d' });
  return token;
}
