import { Request, Response } from 'express';
import Company from '../models/company';
import logger from '../helpers/winstonLogger'; // Importa tu logger

export async function createCompany(req: Request, res: Response): Promise<Response> {
    try {
        const NEWREGISTER = {
            name: req.body.name.toUpperCase().trim(),
            nit: req.body.nit.trim(),
            address: req.body.address.trim(),
            phone: req.body.phone.trim(),
            email: req.body.email.trim(),
        };
        const REGISTER = new Company(NEWREGISTER);
        const RESULTSEARCH: any = await Company.find({ $or: [{ name: req.body.name }, { nit: req.body.nit }] });

        if (RESULTSEARCH.length !== 0) {
            // Este es un error de negocio esperado, puedes loguearlo como 'info' o 'warn' si lo deseas
            // o simplemente retornar la respuesta sin loguear como 'error'
            return res.status(400).json({ message: `Ya existe una empresa con el nombre ${req.body.name} o el NIT ${req.body.nit}` });
        } else {
            try {
                await REGISTER.save();
                logger.info(`Empresa creada: ${REGISTER.name} (ID: ${REGISTER._id})`); // Log de éxito
                return res.status(200).json(REGISTER);
            } catch (err: any) {
                // Error al guardar en la DB (ej. validación de esquema, error de conexión)
                logger.error(`Error al guardar nueva empresa: ${err.message}`, { details: err }); // Log con detalles del error
                return res.status(400).json({ message: err.message || 'Error al guardar la empresa.' }); // Envía el mensaje de error al cliente
            }
        }
    } catch (error: any) {
        // Errores inesperados en la función (ej. req.body.name es undefined)
        logger.error(`Error inesperado en createCompany: ${error.message}`, { details: error }); // Log del error
        return res.status(400).json({ message: 'Error al crear la empresa.' });
    }
}

// Adapta las demás funciones del controlador (updateCompany, deleteCompany, etc.) de manera similar:
// Reemplaza console.error(err) por logger.error(`Mensaje descriptivo: ${err.message}`, { details: err });
// Para operaciones exitosas, puedes usar logger.info(`Mensaje de éxito...`);
// Asegúrate de que los errores inesperados en el catch externo también se logueen con logger.error.

export async function updateCompany(req: Request, res: Response): Promise<Response> {
    try {
        const NEWREGISTER: any = {
            name: req.body.name.toUpperCase().trim(),
            nit: req.body.nit.trim(),
            address: req.body.address.trim(),
            phone: req.body.phone.trim(),
            email: req.body.email.trim(),
        };
        const RESULTSEARCH: any = await Company.findById(req.params.id);
        if (RESULTSEARCH) { // Verificar si RESULTSEARCH existe
            try {
                const companyUpdated = await Company.findByIdAndUpdate(req.params.id, { $set: NEWREGISTER }, { new: true });
                logger.info(`Empresa actualizada: ${NEWREGISTER.name} (ID: ${req.params.id})`);
                return res.status(200).json(companyUpdated);
            } catch (err: any) {
                logger.error(`Error al actualizar empresa ID ${req.params.id}: ${err.message}`, { details: err });
                return res.status(400).json({ message: err.message || 'Error al actualizar la empresa.' });
            }
        } else {
            return res.status(400).json({ message: `No existe la empresa que desea editar` });
        }
    } catch (error: any) {
        logger.error(`Error inesperado en updateCompany para ID ${req.params.id}: ${error.message}`, { details: error });
        return res.status(400).json({ message: 'Error al actualizar la empresa.' });
    }
}

export async function deleteCompany(req: Request, res: Response): Promise<Response> {
    try {
        const user: any = req.user;
        if (user) {
            try {
                const COMPANY = await Company.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
                if (!COMPANY) {
                    return res.status(404).json({ message: `No se encontró la empresa con ID ${req.params.id}` });
                }
                logger.info(`Empresa marcada como eliminada: ${COMPANY.name} (ID: ${COMPANY._id})`);
                return res.status(200).send({ success: `Empresa eliminada: ${COMPANY.name}` });
            } catch (err: any) {
                logger.error(`Error al marcar como eliminada empresa ID ${req.params.id}: ${err.message}`, { details: err });
                return res.status(400).send({ message: `Error al eliminar la empresa con ID ${req.params.id}` });
            }
        } else {
            return res.status(401).send({ message: `Usuario No autenticado` });
        }
    } catch (error: any) {
        logger.error(`Error inesperado en deleteCompany para ID ${req.params.id}: ${error.message}`, { details: error });
        return res.status(400).json({ message: 'Error al eliminar la empresa.' });
    }
}

export async function companiesNames(req: Request, res: Response): Promise<Response> {
    try {
        let listNames: string[] = [];
        const RESULT: any = await Company.find({deleted: false}, { _id: 0, name: 1 }).sort({ name: 1 });
        RESULT.forEach((element: any) => {
            listNames.push(element.name);
        });
        logger.info('Nombres de empresas obtenidos exitosamente.');
        return res.status(200).json(listNames.sort());
    } catch (error: any) {
        logger.error(`Error en companiesNames: ${error.message}`, { details: error });
        return res.status(400).json({ message: 'Error al obtener los nombres de las empresas.' });
    }
}

export async function companies(req: Request, res: Response): Promise<Response> {
    try {
        const RESULT: any = await Company.find({}).sort({ name: 1 });
        logger.info('Todas las empresas obtenidas exitosamente.');
        return res.status(200).json(RESULT);
    } catch (error: any) {
        logger.error(`Error en companies: ${error.message}`, { details: error });
        return res.status(400).json({ message: 'Error al obtener las empresas.' });
    }
}

export async function companyById(req: Request, res: Response): Promise<Response> {
    try {
        const RESULT: any = await Company.findById(req.params.id);
        if (!RESULT) {
            return res.status(404).json({ message: `Empresa con ID ${req.params.id} no encontrada.` });
        }
        logger.info(`Empresa obtenida por ID: ${req.params.id}`);
        return res.status(200).json(RESULT);
    } catch (error: any) {
        logger.error(`Error en companyById para ID ${req.params.id}: ${error.message}`, { details: error });
        return res.status(400).json({ message: 'Error al obtener la empresa por ID.' });
    }
}

export async function companiesActive(req: Request, res: Response): Promise<Response> {
    try {
        const RESULT: any = await Company.find({deleted: false}).sort({ name: 1 });
        logger.info('Empresas activas obtenidas exitosamente.');
        return res.status(200).json(RESULT);
    } catch (error: any) {
        logger.error(`Error en companiesActive: ${error.message}`, { details: error });
        return res.status(400).json({ message: 'Error al obtener las empresas activas.' });
    }
}

export async function companiesWithLimit(req: Request, res: Response): Promise<Response> {
    try {
        const limit = parseInt(req.params.limit, 10);
        if (isNaN(limit) || limit <= 0) {
            return res.status(400).json({ message: 'El límite debe ser un número positivo.' });
        }
        const RESULT: any = await Company.find({deleted: false}).sort({ name: 1 }).limit(limit);
        logger.info(`Empresas con límite ${limit} obtenidas exitosamente.`);
        return res.status(200).json(RESULT);
    } catch (error: any) {
        logger.error(`Error en companiesWithLimit con límite ${req.params.limit}: ${error.message}`, { details: error });
        return res.status(400).json({ message: 'Error al obtener las empresas con límite.' });
    }
}