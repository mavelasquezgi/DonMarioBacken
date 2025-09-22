import { createLogger, format, transports, Logger } from 'winston';
import 'winston-daily-rotate-file'; // Asegúrate de que este import esté presente
import config from '../config/config';

const { combine, timestamp, printf, errors, colorize } = format;

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
    // Si el error tiene un stack trace, lo incluimos
    if (stack) {
        return `${timestamp} ${level}: ${message}\n${stack}`;
    }
    return `${timestamp} ${level}: ${message}`;
});

// Configuración del transporte de rotación de archivos para errores
const errorRotateFileTransport = new transports.DailyRotateFile({
    filename: `${config.PATH.TEMP}/logs/error-%DATE%.log`, // logs/error-YYYY-MM-DD.log
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
});

// Configuración de un transporte para logs generales (info, warn, etc.)
const combineRotateFileTransport = new transports.DailyRotateFile({
    filename: `${config.PATH.TEMP}/logs/combined-%DATE%.log`, // logs/combined-YYYY-MM-DD.log
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
});

// Crea la instancia del logger
const logger: Logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        new transports.Console({
            level: 'debug', // Muestra debug, info, warn, error en consola durante desarrollo
            format: combine(
                colorize(),
                logFormat
            )
        }),
        errorRotateFileTransport,
        combineRotateFileTransport
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: `${config.PATH.TEMP}/logs/exceptions-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        }),
        new transports.Console()
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: `${config.PATH.TEMP}/logs/rejections-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        }),
        new transports.Console()
    ]
});

export default logger;