import { Request, Response } from 'express';
import Store, { StoreI } from '../models/store'; // Importar la interfaz StoreI
import Location from '../models/locations';
import logger from '../helpers/winstonLogger';
import mongoose from 'mongoose';

// --- CREATE STORE ---
export async function createStore(req: Request, res: Response): Promise<Response> {
    const { name, country, department, city, address, nit } = req.body;
    logger.info(`Attempting to create a new store with name: ${name}, NIT: ${nit}`);

    // 1. Validación básica de campos requeridos (incluyendo nit, si se considera requerido)
    // Si 'nit' es opcional en el modelo, elimínalo de esta validación.
    if (!name || !country || !department || !city || !address) {
        logger.warn(`Validation Error: Missing required fields for store creation.`);
        return res.status(400).json({ message: "Los campos name, country, department, city y address son requeridos." });
    }

    // 2. Crear objeto de la nueva tienda (incluyendo nit)
    const NEW_STORE_DATA: Partial<StoreI> = { name, country, department, city, address, nit };

    try {
        // 3. Verificar si ya existe una tienda con el mismo nombre
        // El campo 'name' tiene 'unique: true' en el modelo
        const existingStore = await Store.findOne({ name: name.trim() });
        if (existingStore) {
            logger.warn(`Store creation failed: A store with the name '${name}' already exists.`);
            return res.status(409).json({ message: `Ya existe una tienda con el nombre ${name}` }); // 409 Conflict
        }

        // Opcional: Si el 'nit' fuera único en el modelo, podrías hacer una verificación similar aquí:
        /*
        if (nit && nit.trim()) {
            const existingNit = await Store.findOne({ nit: nit.trim() });
            if (existingNit) {
                logger.warn(`Store creation failed: A store with the NIT '${nit}' already exists.`);
                return res.status(409).json({ message: `Ya existe una tienda con el NIT ${nit}` });
            }
        }
        */

        const store = new Store(NEW_STORE_DATA);
        await store.save();

        logger.info(`Store '${name}' created successfully with ID: ${store._id}`);
        return res.status(201).json({ success: `Tienda ${name} creada`, storeId: store._id }); // 201 Created
    } catch (err: any) {
        logger.error(`Error creating store '${name}': ${err.message}`, err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: `Error de validación al crear la tienda: ${err.message}` });
        }
        return res.status(500).json({ message: `Error interno del servidor al crear la tienda.` });
    }
}

// --- GET STORE BY ID ---
export async function getStoreById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params; // Usar req.params para IDs

    logger.info(`Attempting to fetch store with ID: ${id}`);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`Validation Error: Invalid or missing store ID for retrieval: ${id}`);
        return res.status(400).json({ message: "ID de la tienda inválido o no proporcionado." });
    }

    try {
        const store = await Store.findById(id).lean(); // Usar .lean() para documentos de solo lectura
        if (!store) {
            logger.warn(`Store not found for ID: ${id}`);
            return res.status(404).json({ message: `Tienda con ID ${id} no encontrada.` }); // 404 Not Found
        }

        logger.info(`Successfully fetched store with ID: ${id}`);
        return res.status(200).json(store);
    } catch (error: any) {
        logger.error(`Error fetching store with ID ${id}: ${error.message}`, error);
        return res.status(500).json({ message: `Error interno del servidor al obtener la tienda.` });
    }
}

// --- UPDATE STORE ---
export async function updateStore(req: Request, res: Response): Promise<Response> {
    const { id } = req.params; // Usar req.params para IDs
    const { name, country, department, city, address, nit } = req.body;

    logger.info(`Attempting to update store with ID: ${id}. New name: ${name}`);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`Validation Error: Invalid or missing store ID for update: ${id}`);
        return res.status(400).json({ message: "ID de la tienda inválido o no proporcionado." });
    }

    // 1. Validar campos requeridos para la actualización
    if (!name || !country || !department || !city || !address) {
        logger.warn(`Validation Error: Missing required fields for store update for ID: ${id}`);
        return res.status(400).json({ message: "Todos los campos (name, country, department, city, address) son requeridos para la actualización." });
    }

    const UPDATED_STORE_DATA: Partial<StoreI> = { name, country, department, city, address, nit };

    try {
        const existingStore = await Store.findById(id);

        if (!existingStore) {
            logger.warn(`Store update failed: Store with ID '${id}' not found.`);
            return res.status(404).json({ message: `No existe la tienda que desea editar.` }); // 404 Not Found
        }

        const trimmedNewName = name.trim();

        // 2. Verificar conflicto de nombre si el nombre ha cambiado
        if (existingStore.name !== trimmedNewName) {
            logger.debug(`Store name change detected from '${existingStore.name}' to '${trimmedNewName}'. Checking for name conflicts.`);

            const nameConflict = await Store.findOne({ name: trimmedNewName });
            if (nameConflict) {
                logger.warn(`Store update failed: Another store with the name '${trimmedNewName}' already exists.`);
                return res.status(409).json({ message: `Ya existe una tienda con el nombre ${trimmedNewName}` }); // 409 Conflict
            }
        }

        // 3. Actualizar la tienda
        const oldName = existingStore.name; // Guardamos el nombre viejo antes de actualizar
        const updatedStore = await Store.findByIdAndUpdate(
            id,
            { $set: UPDATED_STORE_DATA },
            { new: true, runValidators: true } // new: true devuelve el documento actualizado; runValidators: true ejecuta validaciones
        );

        if (!updatedStore) {
            // Esto no debería pasar si ya verificamos con findById, pero es buena práctica.
            logger.warn(`Store update failed unexpectedly for ID: ${id}.`);
            return res.status(500).json({ message: `Error interno al actualizar la tienda.` });
        }

        logger.info(`Store with ID '${id}' updated successfully. New Name: ${updatedStore.name}`);

        // 4. Actualizar las ubicaciones si el nombre de la tienda ha cambiado
        if (oldName !== updatedStore.name) {
            try {
                const updateLocationsResult = await Location.updateMany(
                    { location: oldName },
                    { $set: { location: updatedStore.name } }
                );
                logger.info(`Updated ${updateLocationsResult.modifiedCount} locations from name '${oldName}' to '${updatedStore.name}' for store ID: ${id}.`);
            } catch (locationErr: any) {
                logger.error(`Error updating locations for store name change from '${oldName}' to '${updatedStore.name}': ${locationErr.message}`, locationErr);
                // Advertir sobre el error pero retornar éxito para la tienda, ya que es una operación secundaria.
                logger.warn(`Update of related locations failed, but store update was successful for ID: ${id}.`);
            }
        }

        return res.status(200).json({ success: `Tienda ${updatedStore.name} actualizada` });
    } catch (err: any) {
        logger.error(`Error updating store with ID '${id}': ${err.message}`, err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: `Error de validación al actualizar la tienda: ${err.message}` });
        }
        return res.status(500).json({ message: `Error interno del servidor al actualizar la tienda.` });
    }
}

// --- DELETE (TOGGLE DELETED STATUS) ---
export async function deleteStore(req: Request, res: Response): Promise<Response> {
    const { id } = req.params; // Usar req.params para IDs
    const { deleted } = req.body;
    const user: any = req.user;

    logger.info(`Attempting to change 'deleted' status for store ID: ${id} to ${deleted} by user: ${user?.email || 'N/A'}`);

    // 1. Autorización: Solo el rol 'Admin' puede realizar esta acción
    if (!user || user.role !== "Admin") {
        logger.warn(`Unauthorized attempt to change store deleted status by user: ${user?.email || 'N/A'}. Role: ${user?.role || 'N/A'}`);
        return res.status(403).send({ message: `Usuario no autorizado para realizar esta acción.` }); // 403 Forbidden
    }

    try {
        // 2. Validación de ID y estado 'deleted'
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`Invalid store ID provided for delete/restore operation: ${id}`);
            return res.status(400).send({ message: `ID de la tienda inválido o no proporcionado.` });
        }
        if (typeof deleted !== 'boolean') {
            logger.warn(`Invalid 'deleted' status provided for store ID ${id}: ${deleted}`);
            return res.status(400).send({ message: `El estado 'deleted' es requerido y debe ser un valor booleano (true/false).` });
        }

        // 3. Actualizar el estado 'deleted'
        const updatedStore = await Store.findByIdAndUpdate(
            id,
            { $set: { deleted: deleted } },
            { new: true, runValidators: true } // Siempre usar new: true para obtener el doc actualizado y runValidators
        );

        if (updatedStore) {
            const action = deleted ? 'eliminada' : 'restaurada';
            logger.info(`Store ${id} 'deleted' status updated to ${deleted} successfully. Store name: ${updatedStore.name}`);
            return res.status(200).send({ success: `Tienda ${updatedStore.name} ${action}` });
        } else {
            logger.warn(`Store with ID ${id} not found for delete/restore operation.`);
            return res.status(404).send({ message: `Tienda con ID ${id} no encontrada.` }); // 404 Not Found
        }
    } catch (err: any) {
        logger.error(`Error updating 'deleted' status for store ID ${id}: ${err.message}`, err);
        return res.status(500).send({ message: `Error interno del servidor al actualizar la tienda.` });
    }
}

// --- STORES NAMES ---
export async function storesNames(req: Request, res: Response): Promise<Response> {
    logger.info(`Fetching names of active stores.`);
    try {
        // Uso de .select() para mayor claridad sobre los campos devueltos.
        const results = await Store.find({ deleted: false }).select('name').sort({ name: 1 }).lean();
        const listNames: string[] = results.map((element: any) => element.name);

        logger.info(`Successfully retrieved ${listNames.length} active store names.`);
        return res.status(200).json(listNames);
    } catch (error: any) {
        logger.error(`Error fetching store names: ${error.message}`, error);
        return res.status(500).json({ message: `Error interno del servidor al obtener los nombres de las tiendas.` });
    }
}

// --- ALL STORES ---
export async function stores(req: Request, res: Response): Promise<Response> {
    logger.info(`Fetching all stores.`);
    try {
        const results = await Store.find({}).lean(); // Usar .lean() para un mejor rendimiento
        logger.info(`Successfully retrieved ${results.length} stores.`);
        return res.status(200).json(results);
    } catch (error: any) {
        logger.error(`Error fetching all stores: ${error.message}`, error);
        return res.status(500).json({ message: `Error interno del servidor al obtener las tiendas.` });
    }
}

export async function getStoresByFilter(req: Request, res: Response): Promise<Response> {
    const queryFilters = req.query;
    logger.info(`Attempting to fetch stores with filters: ${JSON.stringify(queryFilters)}`);

    // Objeto de consulta para MongoDB
    const mongoQuery: any = {};
    const allowedFields: (keyof StoreI)[] = ['name', 'country', 'department', 'city', 'address', 'nit', 'deleted', '_id'];

    // 1. Construir el filtro de MongoDB a partir de req.query
    for (const key in queryFilters) {
        if (Object.prototype.hasOwnProperty.call(queryFilters, key) && allowedFields.includes(key as keyof StoreI)) {
            const value = queryFilters[key];

            if (typeof value === 'string' && value.length > 0) {
                // Manejo de búsqueda por cadena (ej. name, city) con insensibilidad a mayúsculas/minúsculas o coincidencia parcial
                if (key === 'name' || key === 'department' || key === 'city' || key === 'nit') {
                    // Usar $regex para coincidencia parcial e insensibilidad a mayúsculas/minúsculas
                    mongoQuery[key] = { $regex: value, $options: 'i' };
                }
                // Manejo de ID (debe ser un ID válido)
                else if (key === '_id' && mongoose.Types.ObjectId.isValid(value)) {
                    mongoQuery[key] = value;
                }
                // Manejo de booleanos (ej. 'deleted')
                else if (key === 'deleted') {
                    mongoQuery[key] = value.toLowerCase() === 'true';
                }
                // Coincidencia exacta para otros campos (ej. 'country')
                else {
                    mongoQuery[key] = value;
                }
            }
        }
    }

    try {
        // 2. Ejecutar la consulta en la base de datos
        const stores = await Store.find(mongoQuery).lean();

        logger.info(`Successfully fetched ${stores.length} stores matching the filters: ${JSON.stringify(mongoQuery)}`);
        return res.status(200).json(stores);
    } catch (error: any) {
        logger.error(`Error fetching stores by filter ${JSON.stringify(mongoQuery)}: ${error.message}`, error);
        return res.status(500).json({ message: `Error interno del servidor al obtener las tiendas por filtro.` });
    }
}