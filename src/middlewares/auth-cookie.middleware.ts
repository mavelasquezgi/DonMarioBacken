// En tu middleware src/middlewares/auth-cookie.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../helpers/jwt_helpers';
import logger from '../helpers/winstonLogger';
import { DecodedTokenPayload } from '../types/decoded_token_payload'; // Ajusta la ruta

export const verifyCookieToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.authToken;

    if (!token) {
        logger.warn('Auth failed: No token found in cookies.');
        return res.status(401).send({ message: 'No autenticado: Token de sesión no encontrado.' });
    }

    try {
        const decodedPayload = await verifyToken(token) as DecodedTokenPayload;
        
        // Transforma o castea decodedPayload a IUser si es seguro hacerlo
        req.user = decodedPayload as any; // Ajusta según tu definición de IUser

        logger.info(`Token verified successfully. User ID: ${decodedPayload.id}`);
        next();
    } catch (error: any) {
        logger.error(`Token verification failed: ${error.message}`);
        res.clearCookie('authToken');
        return res.status(401).send({ message: 'No autorizado: Token de sesión inválido o expirado.' });
    }
};