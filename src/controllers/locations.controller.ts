import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Location, { CreateLocationDTO } from '../models/locations';
import logger from '../helpers/winstonLogger';

class CustomError extends Error {
    status?: number;
    constructor(message: string, status: number = 500) {
        super(message);
        this.name = 'CustomError';
        this.status = status;
    }
}

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

export async function createLocation(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const { idStore,price, stock, discountPer, unitDiscount, deliveryService, onStore, idProduct, store_price } = req.body;

        if (!idStore || !idProduct) {
            logger.warn('Missing required fields (idStore or idProduct).', { body: req.body });
            return res.status(400).json({ message: 'Store ID and Product ID are required.' });
        }

        if (!isValidObjectId(idStore) || !isValidObjectId(idProduct)) {
            return res.status(400).json({ message: 'Invalid format for Store ID or Product ID.' });
        }

        const NEWLOCATION_DATA: CreateLocationDTO = {
            idStore: idStore,
            idProduct: idProduct,
            price: price ?? 0,
            store_price: store_price ?? 0,
            stock: stock ?? 0,
            discountPer: discountPer ?? 0,
            unitDiscount: unitDiscount ?? 1,
            deliveryService: deliveryService ?? true,
            onStore: onStore ?? true,
        } 

        const existingLocation = await Location.findOne({ idStore: NEWLOCATION_DATA.idStore, idProduct: NEWLOCATION_DATA.idProduct });
        if (existingLocation) {
            const message = `A record already exists for product ${idProduct} in store ${idStore}.`;
            logger.warn(message, { productId: idProduct, idStore });
            return res.status(400).json({ message });
        }

        const newLocation = new Location(NEWLOCATION_DATA);
        await newLocation.save();
        logger.info(`Product ${idProduct} successfully added to store ${idStore}. ID: ${newLocation._id}`);
        return res.status(201).json({ success: `Producto adicionado a la tienda #${idStore} con ID de registro: ${newLocation._id}` });

    } catch (error: any) {
        logger.error(`Error creating location for product ${req.body.idProduct}: ${error.message}`, { stack: error.stack, details: error, body: req.body });
        next(new CustomError('Error creating the location record.', 500));
    }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const { id, idStore, idProduct, ...updateFields } = req.body;

        if (!id) {
            logger.warn('Missing ID for updating a location record.', { body: req.body });
            return res.status(400).json({ message: 'Location record ID is required for update.' });
        }
        if (!isValidObjectId(id)) {
             return res.status(400).json({ message: 'Invalid format for Location record ID.' });
        }

        const updateData: Partial<Location> = {};
        for (const key in updateFields) {
            if (updateFields[key] !== undefined) {
                (updateData as any)[key] = updateFields[key];
            }
        }

        const updatedLocation = await Location.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedLocation) {
            logger.warn(`Location record with ID ${id} not found for update.`);
            return res.status(404).json({ message: `Location record with ID ${id} not found.` });
        }

        logger.info(`Location record ID ${id} updated successfully. Store: ${updatedLocation.idStore}, Product: ${updatedLocation.idProduct}`);
        return res.status(200).json({ success: `Registro de inventario actualizado: ID ${id}` });

    } catch (error: any) {
        logger.error(`Error updating location record (ID: ${req.body.id}): ${error.message}`, { stack: error.stack, details: error, body: req.body });
        next(new CustomError('Error updating the location record.', 500));
    }
}

export async function deleteLocation(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const user: any = req.user;
        const { id, deleted } = req.body;

        if (!id || !isValidObjectId(id)) {
            logger.warn('Missing or invalid ID for deleting a location record.', { body: req.body });
            return res.status(400).json({ message: 'Valid Location ID is required.' });
        }

        if (!user || user.role !== "Admin") {
            logger.warn(`Unauthorized attempt to change deletion status for location record ID: ${id} by user ID: ${user?.id || 'N/A'}`);
            return res.status(403).send({ message: `Unauthorized user.` });
        }

        const updatedLocation = await Location.findByIdAndUpdate(
            id,
            { $set: { deleted: !deleted } },
            { new: true }
        );

        if (!updatedLocation) {
            logger.warn(`Location record with ID ${id} not found for deletion status update.`);
            return res.status(404).send({ message: `Location record with ID ${id} not found.` });
        }

        logger.info(`Location record ID ${id} deletion status toggled to: ${updatedLocation.deleted}`);
        return res.status(200).send({ success: `Estado 'eliminado' de registro ${id} cambiado a: ${updatedLocation.deleted}` });
    } catch (error: any) {
        logger.error(`Error processing deletion status for location record (ID: ${req.body.id}): ${error.message}`, { stack: error.stack, details: error, body: req.body });
        next(new CustomError(`Error updating the deletion status for record ID: ${req.body.id}.`, 500));
    }
}

export async function locations(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const RESULT = await Location.find({ deleted: false });
        logger.info(`All active location records retrieved successfully. Count: ${RESULT.length}`);
        return res.status(200).json(RESULT);
    } catch (error: any) {
        logger.error(`Error retrieving all location records: ${error.message}`, { stack: error.stack, details: error });
        next(new CustomError('Error retrieving all location records.', 500));
    }
}

export async function locationsByProduct(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const { idProduct } = req.body;

        if (!idProduct || !isValidObjectId(idProduct)) {
            logger.warn('Missing or invalid idProduct for locationsByProduct request.', { body: req.body });
            return res.status(400).json({ message: 'Valid Product ID is required.' });
        }

        const RESULT = await Location.find({ idProduct, deleted: false });
        logger.info(`Location records for product ${idProduct} retrieved successfully. Count: ${RESULT.length}`);
        return res.status(200).json(RESULT);

    } catch (error: any) {
        logger.error(`Error retrieving locations for product ${req.body.idProduct}: ${error.message}`, { stack: error.stack, details: error, body: req.body });
        next(new CustomError('Error retrieving locations for the product.', 500));
    }
}

export async function locationsByProductsStore(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const { idProduct, idStore } = req.body;

        if (!idProduct || !idStore || !isValidObjectId(idProduct) || !isValidObjectId(idStore)) {
            logger.warn('Missing or invalid idProduct or idStore for locationsByProductsStore request.', { body: req.body });
            return res.status(400).json({ message: 'Valid Product ID and Store ID are required.' });
        }

        const RESULT = await Location.findOne({ idProduct, idStore, deleted: false });

        if (!RESULT) {
            logger.warn(`No location record found for product ${idProduct} in store ${idStore}.`);
            return res.status(404).json({ message: 'Location record not found for the specified product and store.' });
        }

        logger.info(`Single location record for product ${idProduct} in store ${idStore} retrieved successfully.`);
        return res.status(200).json(RESULT);

    } catch (error: any) {
        logger.error(`Error retrieving locations for product ${req.body.idProduct} in store ${req.body.idStore}: ${error.message}`, { stack: error.stack, details: error, body: req.body });
        next(new CustomError('Error retrieving locations for the product in the specified store.', 500));
    }
}