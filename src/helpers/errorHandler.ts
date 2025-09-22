import { Request, Response, NextFunction } from 'express'; // Importa NextFunction para tipado correcto
import logger from '../helpers/winstonLogger'; // Asegúrate de que la ruta a tu logger sea correcta

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    // Registra la información de la solicitud que causó el error
    logger.error(`Error en la ruta: ${req.method} ${req.originalUrl}`);
    logger.error(`Cuerpo de la solicitud: ${JSON.stringify(req.body)}`); // Puedes omitir esto en producción si contiene datos sensibles
    logger.error(`Headers de la solicitud: ${JSON.stringify(req.headers)}`); // Puedes omitir esto en producción si contiene datos sensibles

    if (typeof (err) === 'string') {
        // Error de aplicación personalizado (ej. throw "Algo salió mal")
        logger.warn(`Error de aplicación personalizado (400 Bad Request): ${err}`);
        return res.status(400).json({ message: err });
    }

    if (err.name === 'UnauthorizedError') {
        // Error de autenticación JWT (por ejemplo, si usas express-jwt)
        logger.warn(`Error de autenticación JWT (401 Unauthorized): ${err.message || 'Token inválido'}`);
        return res.status(401).json({ message: 'Invalid Token' });
    }

    // Errores de validación de Mongoose
    if (err.name === 'ValidationError') {
        logger.warn(`Error de validación de Mongoose (400 Bad Request): ${err.message}`, err);
        return res.status(400).json({ message: err.message });
    }

    // Errores de tipo CastError de Mongoose (ID no válido)
    if (err.name === 'CastError') {
        logger.warn(`Error de tipo de dato (CastError - 400 Bad Request): ${err.message}`, err);
        return res.status(400).json({ message: `Formato de ID inválido: ${err.value}` });
    }

    // Errores de clave duplicada de Mongoose (código 11000)
    if (err.code && err.code === 11000) {
        // Parsear el mensaje de error para hacerlo más amigable si es posible
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        logger.warn(`Error de clave duplicada (409 Conflict): El valor '${value}' ya existe para el campo '${field}'.`, err);
        return res.status(409).json({ message: `El valor '${value}' ya existe para el campo '${field}'.` });
    }

    // Por defecto, es un error de servidor 500
    // Aquí es donde querrás el stack trace completo
    logger.error(`Error interno del servidor (500 Internal Server Error): ${err.message}`, err); // Pasa 'err' para que Winston capture el stack
    return res.status(500).json({ message: 'Algo salió mal en el servidor.', error: err.message });
}