import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import config from "../config/config";
import { Buffer } from 'buffer';
import { pathFolders } from '../helpers/helpers'; // Asegúrate de que esta ruta sea correcta
import logger from '../helpers/winstonLogger'; // Asegúrate de que esta ruta sea correcta

async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        // No es necesario fs.statSync(path) aquí si solo queremos verificar existencia.
        // fs.promises.access ya lanzará un error si el archivo no existe o no es accesible.
        return true;
    } catch (error) {
        // En este contexto, el error solo significa que el archivo no existe o no es accesible,
        // lo cual es el resultado esperado para esta función de verificación.
        return false;
    }
}

export const getFile = async (req: Request, res: Response): Promise<any> => {
    logger.info(`Solicitud para obtener archivo. Carpeta: ${req.params.folder}, Archivo (base64): ${req.params.file}`);
    
    // Verifica si la carpeta solicitada existe en pathFolders
    const folder = (pathFolders as any)[req.params.folder];
    if (!folder) {
        logger.warn(`Carpeta no válida solicitada: ${req.params.folder}`);
        return res.status(400).send("Carpeta no válida."); // 400 Bad Request
    }

    try {
        let strPathFile: string;
        try {
            strPathFile = req.params.file // Buffer.from(req.params.file, 'base64').toString('ascii');
            logger.debug(`Ruta de archivo decodificada: ${strPathFile}`);
        } catch (bufferError) {
            logger.error(`Error al decodificar el nombre del archivo en base64: ${req.params.file}. Error: ${bufferError}`);
            return res.status(400).send("Formato de nombre de archivo inválido."); // 400 Bad Request
        }

        const fileFullPath = path.join(folder, strPathFile);
        logger.debug(`Intentando acceder al archivo: ${fileFullPath}`);

        if (await exists(fileFullPath)) {
            logger.info(`Archivo encontrado, enviando: ${fileFullPath}`);
            return res.sendFile(path.resolve(fileFullPath));
        } else {
            logger.warn(`Archivo no encontrado en la ruta esperada: ${fileFullPath}. Sirviendo imagen por defecto.`);
            // Asegúrate de que config.PATH.URLIMAGESPRODUCT sea la ruta absoluta o relativa correcta
            // y que 'notExists2.png' exista allí.
            return res.status(404).sendFile(path.join(config.PATH.URLIMAGESPRODUCT, 'notExists2.png')); // 404 Not Found
        }
    } catch (e: any) {
        logger.error(`Error inesperado al obtener el archivo: ${e.message}. Stack: ${e.stack}`);
        // Asegúrate de que config.PATH.URLIMAGESPRODUCT sea la ruta absoluta o relativa correcta
        // y que 'notExists2.png' exista allí.
        return res.status(500).sendFile(path.join(config.PATH.URLIMAGESPRODUCT, 'notExists2.png')); // 500 Internal Server Error
    }
}

export const downloadPdf = async (req: Request, res: Response): Promise<any> => {
    logger.info(`Solicitud de descarga de PDF. Carpeta: ${req.params.folder}, Archivo (base64): ${req.params.file}`);

    // Verifica si la carpeta solicitada existe en pathFolders
    const folder = (pathFolders as any)[req.params.folder];
    if (!folder) {
        logger.warn(`Carpeta no válida solicitada para descarga de PDF: ${req.params.folder}`);
        return res.status(400).send("Carpeta no válida."); // 400 Bad Request
    }

    try {
        let strPathFile: string;
        try {
            strPathFile = req.params.file //Buffer.from(req.params.file, 'base64').toString('ascii');
            logger.debug(`Ruta de archivo decodificada para descarga: ${strPathFile}`);
        } catch (bufferError) {
            logger.error(`Error al decodificar el nombre del archivo base64 para descarga: ${req.params.file}. Error: ${bufferError}`);
            return res.status(400).send("Formato de nombre de archivo inválido."); // 400 Bad Request
        }

        const fileFullPath = path.join(folder, strPathFile);
        logger.debug(`Intentando descargar el archivo: ${fileFullPath}`);

        if (await exists(fileFullPath)) {
            logger.info(`Archivo PDF encontrado, iniciando descarga: ${fileFullPath}`);
            // res.download maneja automáticamente el Content-Disposition para descargar
            return res.download(path.resolve(fileFullPath), (err) => {
                if (err) {
                    // Solo loguear si hay un error en el envío después de que el archivo se encontró
                    logger.error(`Error al descargar el archivo ${fileFullPath}: ${err.message}`, err);
                    // Si ya se enviaron las cabeceras, no podemos enviar otra respuesta.
                    // Esto es un error de transmisión que el cliente ya podría estar manejando.
                } else {
                    logger.info(`Archivo ${fileFullPath} descargado con éxito.`);
                }
            });
        } else {
            logger.warn(`Archivo PDF no encontrado para descarga en la ruta esperada: ${fileFullPath}. Sirviendo imagen por defecto.`);
            // Asegúrate de que config.PATH.URLIMAGESPRODUCT sea la ruta absoluta o relativa correcta
            // y que 'notExists2.png' exista allí.
            return res.status(404).download(path.join(config.PATH.URLIMAGESPRODUCT, 'notExists2.png'), (err) => {
                 if (err) {
                    logger.error(`Error al descargar la imagen por defecto 'notExists2.png': ${err.message}`, err);
                 }
            }); // 404 Not Found
        }
    } catch (e: any) {
        logger.error(`Error inesperado al descargar el PDF: ${e.message}. Stack: ${e.stack}`);
        // Asegúrate de que config.PATH.URLIMAGESPRODUCT sea la ruta absoluta o relativa correcta
        // y que 'notExists2.png' exista allí.
        return res.status(500).download(path.join(config.PATH.URLIMAGESPRODUCT, 'notExists2.png'), (err) => {
            if (err) {
                logger.error(`Error al intentar descargar la imagen por defecto 'notExists2.png' tras error crítico: ${err.message}`, err);
            }
        }); // 500 Internal Server Error
    }
}