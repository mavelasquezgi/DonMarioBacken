import { IUSer } from '../models/user';
import { Request } from 'express'; // Import Request

declare global {
  namespace Express {
    interface User extends IUSer {}
  }
}

// Extend the Request interface to include the user property
export interface AuthRequest extends Request {
  user?: IUSer;
}