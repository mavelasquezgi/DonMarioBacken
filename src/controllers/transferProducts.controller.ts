import { Request, Response } from 'express';
import mongoose, { PipelineStage } from 'mongoose';
import TransferProduct from '../models/transferProducts';
import Product from '../models/product';
import Location, { LocationI } from '../models/locations';
import logger from '../helpers/winstonLogger';

// Función para crear una nueva transferencia
export const createTransferProduct = async (req: Request, res: Response) => {
    logger.info(`Attempting to create a new product transfer.`);
    try {
        const { idProduct, originLocation, destinationLocation, quantity, date, notes } = req.body;
        const user: any = req.user;
        const idUser = user?._id;

        if (!idUser) {
            logger.warn('Create Transfer: User not authenticated.');
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }
        if (!idProduct || !originLocation || !destinationLocation || quantity === undefined || quantity === null) {
            logger.warn('Create Transfer: Missing required fields in request body.');
            return res.status(400).json({ message: 'Todos los campos obligatorios deben ser proporcionados.' });
        }

        if (!mongoose.Types.ObjectId.isValid(idProduct)) {
            logger.warn(`Create Transfer: Invalid product ID provided: ${idProduct}`);
            return res.status(400).json({ message: 'El ID del producto no es válido.' });
        }

        const productExists = await Product.findById(idProduct);
        if (!productExists) {
            logger.warn(`Create Transfer: Product with ID ${idProduct} not found.`);
            return res.status(404).json({ message: 'El producto especificado no existe.' });
        }

        const parsedQuantity = parseInt(quantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            logger.warn(`Create Transfer: Invalid quantity provided: ${quantity}`);
            return res.status(400).json({ message: 'La cantidad debe ser un número válido mayor que cero.' });
        }

        // --- Handle Origin Location ---
        const originLocationDoc = await Location.findOne({ idProduct, location: originLocation });
        if (!originLocationDoc) {
            logger.warn(`Create Transfer: Origin location '${originLocation}' not found for product ${idProduct}.`);
            return res.status(404).json({ message: 'La ubicación de origen no existe para el producto especificado.' });
        }
        if (originLocationDoc.stock < parsedQuantity) {
            logger.warn(`Create Transfer: Insufficient stock in origin location '${originLocation}'. Requested: ${parsedQuantity}, Available: ${originLocationDoc.stock}`);
            return res.status(400).json({ message: 'La cantidad solicitada excede el stock disponible en la ubicación de origen.' });
        }

        originLocationDoc.stock -= parsedQuantity;
        try {
            await originLocationDoc.save();
            logger.info(`Create Transfer: Updated stock for origin location '${originLocation}' (Product ID: ${idProduct}). New stock: ${originLocationDoc.stock}`);
        } catch (error: any) {
            logger.error(`Create Transfer: Error updating stock for origin location '${originLocation}': ${error.message}`, error);
            return res.status(500).json({ message: 'Error al actualizar el stock de la ubicación de origen.' });
        }

        // --- Handle Destination Location ---
        const destinationLocationDoc = await Location.findOne({ idProduct, location: destinationLocation });

        if (!destinationLocationDoc) {
            logger.info(`Create Transfer: Destination location '${destinationLocation}' not found for product ${idProduct}. Creating new location.`);
            const locationNew: LocationI = new Location({
                location: destinationLocation,
                price: originLocationDoc.price,
                store_price: originLocationDoc.store_price,
                stock: parsedQuantity,
                discountPer: originLocationDoc.discountPer,
                unitDiscount: originLocationDoc.unitDiscount,
                deliveryService: originLocationDoc.deliveryService,
                onStore: originLocationDoc.onStore,
                numSales: originLocationDoc.numSales,
                numScore: originLocationDoc.numScore,
                idProduct,
                deleted: false
            });

            try {
                await locationNew.save();
                logger.info(`Create Transfer: New destination location '${destinationLocation}' created with stock: ${parsedQuantity}`);
            } catch (error: any) {
                logger.error(`Create Transfer: Error creating new destination location '${destinationLocation}': ${error.message}`, error);
                // Revert origin location stock if destination fails to save
                originLocationDoc.stock += parsedQuantity;
                await originLocationDoc.save().catch((revertErr: any) => logger.error(`Create Transfer: Failed to revert origin stock after destination creation failed: ${revertErr.message}`));
                return res.status(500).json({ message: 'Error al crear la nueva ubicación de destino.' });
            }
        } else {
            // Update the stock of the existing destination location
            destinationLocationDoc.stock += parsedQuantity;
            try {
                await destinationLocationDoc.save();
                logger.info(`Create Transfer: Updated stock for destination location '${destinationLocation}' (Product ID: ${idProduct}). New stock: ${destinationLocationDoc.stock}`);
            } catch (error: any) {
                logger.error(`Create Transfer: Error updating stock for destination location '${destinationLocation}': ${error.message}`, error);
                // Revert origin location stock if destination fails to save
                originLocationDoc.stock += parsedQuantity;
                await originLocationDoc.save().catch((revertErr: any) => logger.error(`Create Transfer: Failed to revert origin stock after destination update failed: ${revertErr.message}`));
                return res.status(500).json({ message: 'Error al actualizar el stock de la ubicación de destino.' });
            }
        }

        // Create the transfer record
        const newTransfer = new TransferProduct({
            idProduct,
            idUser,
            originLocation,
            destinationLocation,
            quantity: parsedQuantity,
            date: date ? new Date(date) : undefined,
            notes
        });

        const savedTransfer = await newTransfer.save();
        logger.info(`Transfer record created successfully for product ${idProduct} from ${originLocation} to ${destinationLocation}. Transfer ID: ${savedTransfer._id}`);
        return res.status(201).json(savedTransfer);

    } catch (error: any) {
        logger.error(`Create Transfer: Unexpected error: ${error.message}`, error);
        return res.status(500).json({ message: 'Error al crear la transferencia.', error: error.message });
    }
};

// Función para obtener todas las transferencias con filtros
export const getAllTransfersProducts = async (req: Request, res: Response) => {
    try {
        // 1. Paginación
        const pageNumber = parseInt(req.query.page as string, 10) || 1;
        const pageSize = parseInt(req.query.quantity as string, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const limit = Math.max(0, pageSize);

        logger.info(`getAllTransfersProducts request: page=${pageNumber}, quantity=${pageSize}`);

        // 2. Filtros
        const queryParams = req.query;
        const pipeline: PipelineStage[] = [];

        // 2.1. Despoblar campos (Lookup) para permitir el filtrado
        // Note: The order of lookups is important for the path in the $match stage.
        pipeline.push(
            {
                $lookup: {
                    from: 'products',
                    localField: 'idProduct',
                    foreignField: '_id',
                    as: 'idProduct',
                },
            },
            { $unwind: { path: '$idProduct', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'idUser',
                    foreignField: '_id',
                    as: 'idUser',
                },
            },
            { $unwind: { path: '$idUser', preserveNullAndEmptyArrays: true } },
        );

        // 2.2. Construcción del objeto de filtro dinámico
        const matchConditions: any[] = [];

        // Filtros de texto con expresiones regulares (insensibles a mayúsculas y minúsculas)
        if (queryParams.originLocation) {
            matchConditions.push({ 'originLocation': { $regex: queryParams.originLocation, $options: 'i' } });
        }
        if (queryParams.destinationLocation) {
            matchConditions.push({ 'destinationLocation': { $regex: queryParams.destinationLocation, $options: 'i' } });
        }
        if (queryParams.notes) {
            matchConditions.push({ 'notes': { $regex: queryParams.notes, $options: 'i' } });
        }
        if (queryParams.idProduct) {
            matchConditions.push({ 'idProduct.name': { $regex: queryParams.idProduct, $options: 'i' } });
        }
        if (queryParams.idUser) {
            // Combina nombres y apellidos para una búsqueda más amplia.
            const userFullName = queryParams.idUser.toString().split(' ').filter(Boolean).map(term => new RegExp(term, 'i'));
            if (userFullName.length > 0) {
                matchConditions.push({
                    $or: [
                        { 'idUser.names': { $in: userFullName } },
                        { 'idUser.lastnames': { $in: userFullName } }
                    ]
                });
            }
        }

        // Filtros de valor exacto
        if (queryParams.quantity) {
            const quantityValue = parseInt(queryParams.quantity as string, 10);
            if (!isNaN(quantityValue)) {
                matchConditions.push({ 'quantity': quantityValue });
            }
        }
        
        // Filtro de fecha
        if (queryParams.date) {
            const date = new Date(queryParams.date as string);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(startOfDay.getDate() + 1);
            matchConditions.push({ 'date': { $gte: startOfDay, $lt: endOfDay } });
        }

        // 3. Aplicar filtros si existen
        if (matchConditions.length > 0) {
            pipeline.push({ $match: { $and: matchConditions } });
            logger.info(`Match conditions applied: ${JSON.stringify(matchConditions)}`);
        }
        
        // 4. Proyección, ordenamiento, y paginación
        // Proyectar solo los campos necesarios y unirlos al pipeline
        pipeline.push(
            {
                $project: {
                    _id: 1,
                    idProduct: { _id: '$idProduct._id', name: '$idProduct.name', code: '$idProduct.code' },
                    idUser: { _id: '$idUser._id', names: '$idUser.names', lastnames: '$idUser.lastnames' },
                    originLocation: 1,
                    destinationLocation: 1,
                    quantity: 1,
                    notes: 1,
                    date: 1,
                    createdAt: 1,
                    updatedAt: 1,
                }
            },
            {
                $facet: {
                    transfers: [
                        { $sort: { createdAt: -1 } }, // Ordenar por fecha de creación descendente
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    total: [{ $count: 'total' }]
                }
            }
        );

        // 5. Ejecutar la agregación
        const result = await TransferProduct.aggregate(pipeline).exec();
        const transfers = result[0]?.transfers || [];
        const total = result[0]?.total[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);

        logger.info(`Successfully retrieved ${transfers.length} transfers out of ${total} total.`);
        return res.status(200).json({
            transfers,
            total,
            page: pageNumber,
            limit: pageSize,
            totalPages
        });

    } catch (error: any) {
        logger.error(`Error fetching all transfers: ${error.message}`, error);
        return res.status(500).json({ message: 'Error al obtener las transferencias.', error: error.message });
    }
};

// Función para obtener una transferencia por su ID
export const getTransferProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Fetching transfer product by ID: ${id}`);
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`Get Transfer by ID: Invalid transfer ID provided: ${id}`);
            return res.status(400).json({ message: 'El ID de la transferencia no es válido.' });
        }

        const transfer = await TransferProduct.findById(id)
            .populate('idProduct', 'name code')
            .populate('idUser', 'names lastnames');

        if (!transfer) {
            logger.info(`Get Transfer by ID: Transfer with ID ${id} not found.`);
            return res.status(404).json({ message: 'Transferencia no encontrada.' });
        }

        logger.info(`Successfully retrieved transfer with ID: ${id}`);
        return res.status(200).json(transfer);
    } catch (error: any) {
        logger.error(`Error fetching transfer by ID ${id}: ${error.message}`, error);
        return res.status(500).json({ message: 'Error al obtener la transferencia.', error: error.message });
    }
};

// Función para obtener las transferencias creadas por el usuario autenticado
export const getTransfersProductsByUser = async (req: Request, res: Response) => {
    logger.info(`Fetching transfers by authenticated user.`);
    try {
        const user: any = req.user;
        if (!user || !user._id) {
            logger.warn('Get Transfers by User: User not authenticated or user ID missing.');
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }
        const idUser = user._id;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const totalTransfers = await TransferProduct.countDocuments({ idUser });
        const transfers = await TransferProduct.find({ idUser })
            .populate('idProduct', 'name code')
            .populate('idUser', 'names lastnames')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        logger.info(`Successfully retrieved ${transfers.length} transfers for user ${idUser} out of ${totalTransfers} total.`);
        return res.status(200).json({
            transfers,
            total: totalTransfers,
            page,
            limit,
            totalPages: Math.ceil(totalTransfers / limit)
        });
    } catch (error: any) {
        logger.error(`Error fetching transfers for user: ${error.message}`, error);
        return res.status(500).json({ message: 'Error al obtener las transferencias del usuario.', error: error.message });
    }
};

// Función para actualizar una transferencia por su ID
// Función para actualizar una transferencia por su ID
export const updateTransferProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Attempting to update transfer product with ID: ${id}`);
    try {
        const { idProduct, originLocation, destinationLocation, quantity, date, notes } = req.body;
        const user: any = req.user;
        if (!user || !user._id) {
            logger.warn('Update Transfer: User not authenticated or user ID missing.');
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }
        const idUser = user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`Update Transfer: Invalid transfer ID provided: ${id}`);
            return res.status(400).json({ message: 'El ID de la transferencia no es válido.' });
        }
        if (idProduct && !mongoose.Types.ObjectId.isValid(idProduct)) {
            logger.warn(`Update Transfer: Invalid product ID provided for update: ${idProduct}`);
            return res.status(400).json({ message: 'El ID del producto no es válido.' });
        }

        const transferToUpdate = await TransferProduct.findById(id);
        if (!transferToUpdate) {
            logger.info(`Update Transfer: Transfer with ID ${id} not found.`);
            return res.status(404).json({ message: 'Transferencia no encontrada.' });
        }

        // Optional: Check if the authenticated user is the creator of the transfer
        if (transferToUpdate.idUser?.toString() !== idUser.toString()) {
            logger.warn(`Update Transfer: User ${idUser} attempted to update transfer ${id} but is not the creator.`);
            return res.status(403).json({ message: 'No tienes permiso para actualizar esta transferencia.' });
        }

        // Prepare update data, converting quantity if provided
        const updateData: any = { idUser }; // Always update with the current user's ID
        if (idProduct) updateData.idProduct = idProduct;
        if (originLocation) updateData.originLocation = originLocation;
        if (destinationLocation) updateData.destinationLocation = destinationLocation;
        if (quantity !== undefined && quantity !== null) {
            const parsedQuantity = parseInt(quantity, 10);
            if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
                logger.warn(`Update Transfer: Invalid quantity provided for update: ${quantity}`);
                return res.status(400).json({ message: 'La cantidad debe ser un número válido mayor que cero.' });
            }
            updateData.quantity = parsedQuantity;
        }
        if (date) updateData.date = new Date(date);
        if (notes) updateData.notes = notes;

        const updatedTransfer = await TransferProduct.findByIdAndUpdate(
            id,
            { $set: updateData }, // Use $set to update only provided fields
            { new: true, runValidators: true } // new: true returns the updated doc, runValidators ensures schema validation
        ).populate('idProduct', 'name code').populate('idUser', 'names lastnames');

        logger.info(`Successfully updated transfer with ID: ${id}`);
        return res.status(200).json(updatedTransfer);
    } catch (error: any) {
        logger.error(`Error updating transfer with ID ${id}: ${error.message}`, error);
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: `Error de validación al actualizar la transferencia: ${error.message}` });
        }
        return res.status(500).json({ message: 'Error al actualizar la transferencia.', error: error.message });
    }
};

// Función para eliminar una transferencia por su ID (lógica: soft delete)
export const deleteTransferProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Attempting to delete (soft delete) transfer product with ID: ${id}`);
    try {
        const user: any = req.user;
        if (!user || !user._id) {
            logger.warn('Delete Transfer: User not authenticated or user ID missing.');
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }
        const idUser = user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`Delete Transfer: Invalid transfer ID provided: ${id}`);
            return res.status(400).json({ message: 'El ID de la transferencia no es válido.' });
        }

        const transferToDelete = await TransferProduct.findById(id);
        if (!transferToDelete) {
            logger.info(`Delete Transfer: Transfer with ID ${id} not found.`);
            return res.status(404).json({ message: 'Transferencia no encontrada.' });
        }

        // Optional: Check if the authenticated user is the creator of the transfer
        if (transferToDelete.idUser?.toString() !== idUser.toString()) {
            logger.warn(`Delete Transfer: User ${idUser} attempted to delete transfer ${id} but is not the creator.`);
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta transferencia.' });
        }

        const deletedTransfer = await TransferProduct.findByIdAndUpdate(id, { deleted: true }, { new: true });
        if (!deletedTransfer) {
            logger.error(`Delete Transfer: Failed to soft delete transfer with ID ${id}.`);
            return res.status(500).json({ message: 'Error al eliminar la transferencia.' });
        }
        logger.info(`Successfully soft deleted transfer with ID: ${id}`);
        return res.status(200).json({ message: `Transferencia eliminada correctamente. ID: ${deletedTransfer?._id}` });
    } catch (error: any) {
        logger.error(`Error deleting transfer with ID ${id}: ${error.message}`, error);
        return res.status(500).json({ message: 'Error al eliminar la transferencia.', error: error.message });
    }
};