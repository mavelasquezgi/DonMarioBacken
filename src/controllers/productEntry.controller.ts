// controllers/productEntryController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProductEntry from '../models/productEntry'; // Import your model and interface
import Company from '../models/company'; // Assuming you have this model
import Location from '../models/locations'; // Assuming you have this model
import logger from '../helpers/winstonLogger'; // Keeping the original import path

// Función para crear una nueva entrada de producto
export const createProductEntry = async (req: Request, res: Response) => {
    const user: any = req.user;
    try {
        const userId = user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }
        const {
            entryType, // 'COMPRA' or 'DEVOLUCIÓN'
            company, // company ID
            location, // product ID
            quantity,
            profitPercentage,
            entryDate, // Optional, defaults to now
            notes,
            unitCost // Assuming you want to track unit price at the time of entry
        } = req.body;

        // Basic validation for required fields from body
        if (!entryType || !company || !location || quantity === undefined || profitPercentage === undefined || unitCost === undefined) {
            return res.status(400).json({ message: 'Los campos obligatorios (entryType, company, location, quantity, profitPercentage, unitCost) deben ser proporcionados.' });
        }

        // Validate entryType enum
        if (!['COMPRA', 'DEVOLUCIÓN'].includes(entryType)) {
            return res.status(400).json({ message: 'El tipo de entrada no es válido. Debe ser "COMPRA" o "DEVOLUCIÓN".' });
        }

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(company)) {
            return res.status(400).json({ message: 'El ID de la compañía no es válido.' });
        }
        if (!mongoose.Types.ObjectId.isValid(location)) {
            return res.status(400).json({ message: 'El ID del producto no es válido.' });
        }


        // Validate numeric fields
        const parsedQuantity = parseFloat(quantity);
        const parsedProfitPercentage = parseFloat(profitPercentage);

        if (isNaN(parsedQuantity) || parsedQuantity < 0) { // Assuming quantity should be non-negative for entries
            return res.status(400).json({ message: 'La cantidad debe ser un número válido no negativo.' });
        }
        if (isNaN(parsedProfitPercentage) || parsedProfitPercentage < 0) {
            return res.status(400).json({ message: 'El porcentaje de ganancia debe ser un número válido no negativo.' });
        }

        const parsedunitCost = parseFloat(unitCost);
        if (isNaN(parsedunitCost) || parsedunitCost < 0) {
            return res.status(400).json({ message: 'El precio unitario debe ser un número válido no negativo.' });
        }

        // Check if referenced documents exist
        const companyExists = await Company.findById(company);
        if (!companyExists) {
            return res.status(404).json({ message: 'La compañía especificada no existe.' });
        }

        const locationExists = await Location.findById(location);
        if (!locationExists) {
            return res.status(404).json({ message: 'El producto especificado no existe.' });
        }

        // User existence check is typically handled by auth middleware, but could add here if needed
        // const userExists = await User.findById(userId);
        // if (!userExists) { return res.status(404).json({ message: 'Usuario no encontrado.' }); }


        const newProductEntry = new ProductEntry({
            entryType,
            company,
            location,
            user: userId, // Assign the authenticated user's ID
            quantity: parsedQuantity,
            unitCost: parsedunitCost,
            profitPercentage: parsedProfitPercentage,
            entryDate: entryDate ? new Date(entryDate) : undefined, // Use provided date or default
            notes
        });

        const savedEntry = await newProductEntry.save();

        // Populate the saved document before sending
        const populatedEntry = await savedEntry
            .populate('company', 'name'); // No receipt population
        const locationUpdate = await Location.updateOne({ _id: location }, { $inc: { stock: parsedQuantity } });
        if (!locationUpdate) {
            return res.status(404).json({ message: 'No se pudo actualizar el stock de products.' });
        }
        return res.status(201).json(populatedEntry);

    } catch (error: any) {
        // Changed console.error to logger.error
        logger.error('Error al crear la entrada de producto:', error);
        // Check for potential Mongoose validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Error de validación al crear la entrada.', error: error.message });
        }
        return res.status(500).json({ message: 'Error interno del servidor al crear la entrada de producto.', error: error.message });
    }
};

// Función para obtener todas las entradas de producto
export const getAllProductEntries = async (req: Request, res: Response) => {
    try {
        // 1. Paginación
        const pageNumber = parseInt(req.query.page as string, 10) || 1;
        const pageSize = parseInt(req.query.quantity as string, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const limit = Math.max(0, pageSize);

        logger.info(`getAllProductEntries request: page=${pageNumber}, quantity=${pageSize}`);

        // 2. Filtros
        const queryParams = req.query;
        const matchConditions: any = {};

        // 2.1. Filtros de campos directos
        if (queryParams.entryType) {
            matchConditions.entryType = { $regex: queryParams.entryType, $options: 'i' };
        }
        
        // 2.2. Filtros de campos poblados (nested)
        // Para filtrar por campos de documentos referenciados, usaremos un pipeline de agregación.
        // Construimos las condiciones de búsqueda para los campos populados.
        const searchConditions: any[] = [];
        if (queryParams.productName) {
            searchConditions.push({ 'location.idProduct.name': { $regex: queryParams.productName, $options: 'i' } });
        }
        if (queryParams.company) {
            searchConditions.push({ 'company.name': { $regex: queryParams.company, $options: 'i' } });
        }
        if (queryParams.location) {
            searchConditions.push({ 'location.location': { $regex: queryParams.location, $options: 'i' } });
        }

        // 3. Construcción del pipeline de agregación
        const pipeline: any[] = [];

        // Paso 3.1: Despoblar campos (Lookup)
        pipeline.push(
            {
                $lookup: {
                    from: 'locations',
                    localField: 'location',
                    foreignField: '_id',
                    as: 'location',
                },
            },
            { $unwind: '$location' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'location.idProduct',
                    foreignField: '_id',
                    as: 'location.idProduct',
                },
            },
            { $unwind: '$location.idProduct' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company',
                    foreignField: '_id',
                    as: 'company',
                },
            },
            { $unwind: '$company' }
        );

        // Paso 3.2: Aplicar filtros si existen
        const finalMatchConditions: any[] = [];

        // Incluir las condiciones del campo directo (entryType)
        if (Object.keys(matchConditions).length > 0) {
            finalMatchConditions.push(matchConditions);
        }

        // Incluir las condiciones de búsqueda de campos populados
        if (searchConditions.length > 0) {
            finalMatchConditions.push({ $and: searchConditions });
        }

        if (finalMatchConditions.length > 0) {
            pipeline.push({ $match: { $and: finalMatchConditions } });
            logger.info(`Match conditions applied: ${JSON.stringify(finalMatchConditions)}`);
        }

        // Paso 3.3: Proyectar y obtener total y resultados
        pipeline.push(
            {
                $facet: {
                    entries: [{ $skip: skip }, { $limit: limit }],
                    total: [{ $count: 'total' }]
                }
            }
        );

        // 4. Ejecutar la agregación
        const result = await ProductEntry.aggregate(pipeline).exec();
        const entries = result[0]?.entries || [];
        const total = result[0]?.total[0]?.total || 0;

        logger.info(`Successfully retrieved ${entries.length} product entries, total count: ${total}`);
        return res.status(200).json({ total, entries });

    } catch (error: any) {
        logger.error('Error al obtener las entradas de producto:', error);
        return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Función para obtener todas las entradas de producto
export const getAllActiveProductEntries = async (req: Request, res: Response) => {
    try {
        const pageNumber = parseInt(req.query.page as string, 10) || 1;
        const pageSize = parseInt(req.query.quantity as string, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const limit = Math.max(0, pageSize);

        const totalEntries = await ProductEntry.countDocuments({ deleted: false });
        const entries = await ProductEntry.find({ deleted: false })
            .populate({ path: 'location', select: 'location idProduct', populate: { path: 'idProduct', select: 'name' } })
            .populate({ path: 'user', select: 'names lastnames' })
            .populate({ path: 'company', select: 'name' })
            .skip(skip)
            .limit(limit)
            .exec();

        return res.status(200).json({ total: totalEntries, entries });
    } catch (error: any) {
        // Changed console.error to logger.error
        logger.error('Error al obtener las entradas de producto:', error);
        return res.status(500).json({ message: 'Error interno del servidor al obtener las entradas de producto.', error: error.message });
    }
};

// Función para obtener una entrada de producto por su ID
export const getProductEntryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'El ID de la entrada de producto no es válido.' });
        }

        const entry = await ProductEntry.findById(id).populate({ path: 'company', select: 'name' }).populate({ path: 'location', select: 'location idProduct', populate: { path: 'idProduct', select: 'name' } }).populate({ path: 'user', select: 'names lastnames' });

        if (!entry) {
            return res.status(404).json({ message: 'Entrada de producto no encontrada.' });
        }

        return res.status(200).json(entry);
    } catch (error: any) {
        // Changed console.error to logger.error
        logger.error('Error al obtener la entrada de producto por ID:', error);
        return res.status(500).json({ message: 'Error interno del servidor al obtener la entrada de producto.', error: error.message });
    }
};

// Función para obtener las entradas de producto creadas por el usuario autenticado
export const getProductEntriesByUser = async (req: Request, res: Response) => {
    try {
        const user: any = req.user;
        const userId = user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }

        const pageNumber = parseInt(req.query.page as string, 10) || 1;
        const pageSize = parseInt(req.query.quantity as string, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const limit = Math.max(0, pageSize);

        const totalEntries = await ProductEntry.countDocuments({ user: userId });
        const entries = await ProductEntry.find({ user: userId })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({ total: totalEntries, entries });
    } catch (error: any) {
        // Changed console.error to logger.error
        logger.error('Error al obtener las entradas de producto por usuario:', error);
        return res.status(500).json({ message: 'Error interno del servidor al obtener las entradas de producto por usuario.', error: error.message });
    }
};

// Función para actualizar una entrada de producto por su ID
export const updateProductEntry = async (req: Request, res: Response) => {
    try {
        const user: any = req.user;
        const userId = user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }
        const { id } = req.params;
        const {
            entryType,
            company,
            location,
            quantity,
            unitCost, // Added unitCost
            profitPercentage,
            entryDate,
            notes
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'El ID de la entrada de producto no es válido.' });
        }

        const entryToUpdate = await ProductEntry.findById(id);

        if (!entryToUpdate) {
            return res.status(404).json({ message: 'Entrada de producto no encontrada.' });
        }

        // Construct update object with all potential fields, allowing omission
        const updateFields: any = {};

        // Validation for entryType if provided
        if (entryType !== undefined) {
            if (!['COMPRA', 'DEVOLUCIÓN'].includes(entryType)) {
                return res.status(400).json({ message: 'El tipo de entrada proporcionado no es válido. Debe ser "COMPRA" o "DEVOLUCIÓN".' });
            }
            updateFields.entryType = entryType;
        }

        // Validation for company if provided (assuming it's an ObjectId)
        if (company !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(company)) {
                return res.status(400).json({ message: 'El ID de la compañía proporcionado no es válido.' });
            }
            updateFields.company = company;
        }

        // Validation for location if provided (assuming it's an ObjectId)
        if (location !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(location)) {
                return res.status(400).json({ message: 'El ID de la ubicación proporcionado no es válido.' });
            }
            updateFields.location = location;
        }

        // Validation for quantity if provided
        if (quantity !== undefined) {
            const parsedQuantity = parseFloat(quantity);
            if (isNaN(parsedQuantity) || parsedQuantity < 0) {
                return res.status(400).json({ message: 'La cantidad debe ser un número válido no negativo.' });
            }
            updateFields.quantity = parsedQuantity;
        }

        // Validation for unitCost if provided
        if (unitCost !== undefined) {
            const parsedUnitCost = parseFloat(unitCost);
            if (isNaN(parsedUnitCost) || parsedUnitCost < 0) {
                return res.status(400).json({ message: 'El costo unitario debe ser un número válido no negativo.' });
            }
            updateFields.unitCost = parsedUnitCost;
        }

        // Validation for profitPercentage if provided
        if (profitPercentage !== undefined) {
            const parsedProfitPercentage = parseFloat(profitPercentage);
            if (isNaN(parsedProfitPercentage) || parsedProfitPercentage < 0) {
                return res.status(400).json({ message: 'El porcentaje de ganancia debe ser un número válido no negativo.' });
            }
            updateFields.profitPercentage = parsedProfitPercentage;
        }

        // Validation for entryDate if provided
        if (entryDate !== undefined) {
            const parsedDate = new Date(entryDate);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ message: 'La fecha de entrada proporcionada no es válida.' });
            }
            updateFields.entryDate = parsedDate;
        }

        // Always update notes if provided
        if (notes !== undefined) {
            updateFields.notes = notes;
        }

        // Prevent user and deleted fields from being updated via body
        delete updateFields.user;
        delete updateFields.deleted;

        const updatedEntry = await ProductEntry.findByIdAndUpdate(
            id,
            { $set: updateFields }, // Use $set to only update provided fields
            { new: true, runValidators: true }
        ).populate('company location user'); // Consider populating relevant fields

        if (!updatedEntry) {
            return res.status(404).json({ message: 'Error al actualizar la entrada de producto. No se encontró.' });
        }

        return res.status(200).json(updatedEntry);

    } catch (error: any) {
        // Changed console.error to logger.error
        logger.error('Error al actualizar la entrada de producto:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Error de validación al actualizar la entrada.', errors: error.errors });
        }
        return res.status(500).json({ message: 'Error interno del servidor al actualizar la entrada de producto.', error: error.message });
    }
};


// Función para eliminar una entrada de producto por su ID
export const deleteProductEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user: any = req.user;
        const userId = user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'El ID de la entrada de producto no es válido.' });
        }

        const entryToDelete = await ProductEntry.findById(id);

        if (!entryToDelete) {
            return res.status(404).json({ message: 'Entrada de producto no encontrada.' });
        }

        const registerDeleted = await ProductEntry.findByIdAndUpdate(id, { deleted: true }, { new: true });

        return res.status(200).json(registerDeleted); // 204 No Content for successful deletion

    } catch (error: any) {
        // Changed console.error to logger.error
        logger.error('Error al eliminar la entrada de producto:', error);
        return res.status(500).json({ message: 'Error interno del servidor al eliminar la entrada de producto.', error: error.message });
    }
};