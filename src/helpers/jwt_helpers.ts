import jwt from 'jsonwebtoken'
import config from '../config/config'
import { TokenPayload } from '../models/payloadJwt.dto';

export const createToken = ( payload: TokenPayload, expiresIn: number) => {
    return new Promise((resolve, reject) => {
        const options = {
            expiresIn: expiresIn,
            issuer: 'amas.com.co',
            audience: String(payload.id),
        }
        jwt.sign(payload, config.jwtSecret, options, (err, token) => {
            if (err) reject(err);
            resolve(token);
        });
    });
}

export const verifyToken = async  (token: string): Promise<TokenPayload | { data: null; message: string }> => {
    return new Promise((resolve, reject) => {
        try {
            jwt.verify(token, config.jwtSecret, (err, tokenOut) => {
                if (err instanceof jwt.TokenExpiredError) {
                    console.error('JWT Expired Error:', err.message)
                    resolve({ data: null, message: `JWT Expired Error: ${err.message}` });
                }

                if (err instanceof jwt.JsonWebTokenError) {
                    console.error('JWT Token Error:', err.message)
                    //reject("reject");
                    resolve({ data: null, message: `JWT Token Error: ${err.message}` });
                }

                if (err instanceof jwt.NotBeforeError) {
                    console.error('JWT Not Before Error:', err.message)
                    resolve({ data: null, message: `JWT Not Before Error: ${err.message}` });
                }
                resolve(tokenOut as TokenPayload);
            });
        } catch (err) {
            console.error(err);
        }
    });
}