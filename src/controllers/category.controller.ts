import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose'; // Importamos Types para trabajar con ObjectIds
import Category from '../models/category';
import { ascendentObjCompare } from '../helpers/helpers';
import logger from '../helpers/winstonLogger';
import { UserRole } from '../models/role';

// Definición de un error personalizado para un manejo de errores más claro en Express
class CustomError extends Error {
    status?: number;
    constructor(message: string, status: number = 500) {
        super(message);
        this.name = 'CustomError';
        this.status = status;
    }
}

// Validación de saneamiento de campos (Debería moverse a un helper o middleware de validación)
function validate(field: string): boolean {
    const errors: string[] = ["find", "select", "drop", "update", "href", "delete"];
    const fieldLower = field.toLowerCase();
    
    // Verificamos si el campo contiene alguna palabra clave de error
    return !errors.some(errKeyword => fieldLower.includes(errKeyword));
}

// Clase controladora que contiene la lógica de negocio para Categorías
class CategoryControllers {

    // Helper para buscar categorías por ID/Nombre (manteniendo el nombre original)
    public async category(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const categoryIdentifier = req.params.name; 

            if (!categoryIdentifier) {
                logger.warn('Category identifier missing from request params in category method.');
                return res.status(400).json({ message: 'Category identifier (ID or Name) is required.' });
            }

            // Intentamos buscar por ID primero, si parece un ObjectId, o por nombre si no
            const isObjectId = Types.ObjectId.isValid(categoryIdentifier);
            
            const RESULT = isObjectId 
                ? await Category.findById(categoryIdentifier) 
                : await Category.findOne({ name: categoryIdentifier });

            if (!RESULT) {
                logger.info(`Category with identifier ${categoryIdentifier} not found.`);
                return res.status(404).json({ message: 'Category not found.' });
            }

            logger.info(`Category by identifier ${categoryIdentifier} retrieved successfully.`);
            return res.status(200).json(RESULT);
        } catch (error: any) {
            logger.error(`Error retrieving category by identifier ${req.params.name}: ${error.message}`, { stack: error.stack });
            next(new CustomError('Error retrieving category.', 500));
        }
    }

    // Busca una categoría por su ID (similar a la anterior, mantenida para compatibilidad de ruta)
    public async categoryById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const categoryId = req.params.id;

            if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
                logger.warn('Invalid or missing Category ID in categoryById method.');
                return res.status(400).json({ message: 'Valid Category ID is required.' });
            }
            
            const RESULT = await Category.findById(categoryId).exec();

            if (!RESULT) {
                logger.info(`Category with ID ${categoryId} not found.`);
                return res.status(404).json({ message: 'Category not found.' });
            }
            
            logger.info(`Category by ID ${categoryId} retrieved successfully.`);
            return res.status(200).json(RESULT);
        } catch (error: any) {
            logger.error(`Error retrieving category by ID ${req.params.id}: ${error.message}`, { stack: error.stack });
            next(new CustomError('Error retrieving category by ID.', 500));
        }
    }

    // Lista todas las categorías activas y no eliminadas
    public async categories(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const RESULT = await Category.find({ state: "ACTIVE", deleted: false })
                .sort({ priority: 1, name: 1 }) // Ordenar primero por prioridad (ascendente) y luego por nombre
                .exec();

            logger.info('Active categories retrieved successfully.');
            // Usamos Mongoose sort en la query para mayor eficiencia. ascendenteObjCompare
            // se usa aquí por si el cliente necesita un ordenamiento secundario en JS.
            return res.status(200).json(RESULT.sort(ascendentObjCompare("priority")));
        } catch (error: any) {
            logger.error(`Error retrieving active categories: ${error.message}`, { stack: error.stack });
            next(new CustomError('Error retrieving active categories.', 500));
        }
    }

    /**
     * REFRACTORIZADO: Agrupa las categorías por su PARENT ID en lugar del campo 'line' obsoleto.
     * Esto proporciona una vista jerárquica de subcategorías bajo su padre.
     */
    public async listCategoriesByLine(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const RESULT = await Category.aggregate([
                // 1. Filtrar solo categorías activas y no eliminadas que NO sean raíz (tienen padre)
                { $match: { state: "ACTIVE", deleted: false, parent: { $ne: null } } },
                // 2. Agrupar las subcategorías por su parent ID
                {
                    $group: {
                        _id: "$parent", // El ID del grupo es el ID de la categoría padre
                        categories: { $push: { name: "$name", priority: "$priority", _id: "$_id", image: "$image" } }
                    }
                },
                // 3. Obtener los detalles de la categoría padre
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'parentDetails'
                    }
                },
                // 4. Desenrollar los detalles del padre
                { $unwind: { path: '$parentDetails', preserveNullAndEmptyArrays: true } },
                // 5. Proyectar el resultado para una salida limpia
                {
                    $project: {
                        _id: 0,
                        parentId: '$_id',
                        parentName: '$parentDetails.name', // Usamos el nombre del padre como el nuevo 'line'
                        categories: 1
                    }
                }
            ]);

            logger.info('Categories grouped by parent (formerly line) successfully.');
            return res.status(200).json(RESULT.sort(ascendentObjCompare("parentName"))); // Ordenar por el nombre del padre
        } catch (error: any) {
            logger.error(`Error listing categories by parent: ${error.message}`, { stack: error.stack });
            next(new CustomError('Error listing categories by parent.', 500));
        }
    }

    // Lista todas las categorías (incluyendo inactivas y soft-deleted)
    public async categoriesAll(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const RESULT = await Category.find()
                .sort({ priority: 1, name: 1 })
                .exec();
            
            logger.info('All categories retrieved successfully.');
            return res.status(200).json(RESULT.sort(ascendentObjCompare("priority")));
        } catch (error: any) {
            logger.error(`Error retrieving all categories: ${error.message}`, { stack: error.stack });
            next(new CustomError('Error retrieving all categories.', 500));
        }
    }

    // Lista un número limitado de categorías activas
    public async categoriesL(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const limit = parseInt(req.params.limit, 10);
            
            if (isNaN(limit) || limit <= 0) {
                logger.warn(`Invalid limit provided for categoriesL: ${req.params.limit}`);
                return res.status(400).json({ message: 'Limit must be a positive number.' });
            }
            
            const RESULT = await Category.find({ deleted: false, state: "ACTIVE" })
                .sort({ priority: -1 }) // Asumiendo que -1 es el orden deseado
                .limit(limit)
                .exec();

            logger.info(`Limited categories (${limit}) retrieved successfully.`);
            return res.status(200).json(RESULT.sort(ascendentObjCompare("priority")));
        } catch (error: any) {
            logger.error(`Error retrieving limited categories (${req.params.limit}): ${error.message}`, { stack: error.stack });
            next(new CustomError('Error retrieving limited categories.', 500));
        }
    }

    /**
     * REFRACTORIZADO: Se eliminó 'line' y se añadió 'parent'.
     * Asumimos que el middleware Mongoose calculará 'ancestors' automáticamente.
     */
    public async createCategory(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const NAME = req.body.name?.trim();
            const DESCRIPTION = req.body.description?.trim();
            const PARENT_ID = req.body.parent || null; // Nuevo: ID del padre (opcional)

            if (!NAME || !DESCRIPTION) {
                logger.warn('Missing name or description for category creation.');
                return res.status(400).json({ message: 'Category name and description are required.' });
            }

            if (PARENT_ID && !Types.ObjectId.isValid(PARENT_ID)) {
                 return res.status(400).json({ message: 'Provided parent ID is not valid.' });
            }

            if (!validate(NAME) || !validate(DESCRIPTION)) {
                logger.warn(`Invalid content in category name or description: Name='${NAME}', Description='${DESCRIPTION}'`);
                return res.status(400).json({ message: "The content of one of the fields is not valid" });
            }

            // Usamos findOne en lugar de find().length para mejor legibilidad y eficiencia
            const existingCategory = await Category.findOne({ name: NAME }).exec();
            if (existingCategory) {
                const message = `A category with the name "${NAME}" already exists.`;
                logger.warn(message);
                return res.status(400).json({ message });
            } 

            // Verificación de rol de Administrador
            const user: any = req.user;
            if (user?.role in [UserRole.ADMIN, UserRole.STORE]) {
                logger.warn(`Unauthorized attempt to create category by user ID: ${user?.id || 'N/A'}`);
                return res.status(403).json({ message: `You do not have permissions to create categories.` });
            }
            
            const NEWCATEGORY = {
                name: NAME,
                description: DESCRIPTION,
                image: req.file?.filename,
                state: "ACTIVE",
                // Nuevo campo de jerarquía
                parent: PARENT_ID 
            };

            const CATEGORY = new Category(NEWCATEGORY);
            await CATEGORY.save();
            
            logger.info(`Category "${NAME}" created successfully. Category ID: ${CATEGORY._id}`);
            return res.status(200).send({ success: `Category "${NAME}" created successfully` });

        } catch (error: any) {
            // Manejar errores de Mongoose como validación, si ocurren
            if (error.name === 'ValidationError' || error.code === 11000) {
                 return next(new CustomError(`Validation error: ${error.message}`, 400));
            }
            logger.error(`Error creating category: ${error.message}`, { stack: error.stack, body: req.body });
            next(new CustomError('Error creating category.', 500));
        }
    }

    /**
     * REFRACTORIZADO: Se eliminó 'line' y se añadió 'parent'.
     * Usamos findByIdAndUpdate para una operación atómica.
     */
    public async updateCategory(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const CATEGORY_ID = req.body.id;
            const NAME = req.body.name?.trim();
            const DESCRIPTION = req.body.description?.trim();
            const STATE = req.body.state;
            const PRIORITY = req.body.priority;
            const PARENT_ID = req.body.parent || null; // Nuevo: ID del padre (opcional)

            if (!CATEGORY_ID || !Types.ObjectId.isValid(CATEGORY_ID)) {
                logger.warn('Invalid or missing Category ID for update.');
                return res.status(400).json({ message: 'Valid Category ID is required for update.' });
            }
            if (PARENT_ID && !Types.ObjectId.isValid(PARENT_ID)) {
                 return res.status(400).json({ message: 'Provided parent ID is not valid.' });
            }
            if (!NAME || !DESCRIPTION || !STATE) {
                logger.warn(`Missing required fields for category update. ID: ${CATEGORY_ID}`);
                return res.status(400).json({ message: 'Category name, description, and state are required.' });
            }

            if (!validate(NAME) || !validate(DESCRIPTION)) {
                logger.warn(`Invalid content in category name or description for update. ID: ${CATEGORY_ID}, Name='${NAME}'`);
                return res.status(400).json({ message: "The content of one of the fields is not valid" });
            }

            const NEW_DATA: any = {
                name: NAME,
                description: DESCRIPTION,
                priority: PRIORITY,
                state: STATE,
                parent: PARENT_ID // Nuevo campo de jerarquía
            };

            if (req.file) {
                NEW_DATA.image = req.file.filename;
                logger.info(`New image uploaded for category ID: ${CATEGORY_ID}`);
            }

            // Usamos findByIdAndUpdate para una operación más eficiente y atómica.
            // Si el pre('save') hook está en el modelo, se ejecutará y actualizará ancestors.
            const updatedCategory = await Category.findByIdAndUpdate(
                CATEGORY_ID, 
                { $set: NEW_DATA }, 
                { new: true, runValidators: true } // new: true devuelve el documento actualizado
            ).exec();

            if (!updatedCategory) {
                const message = `Category with ID "${CATEGORY_ID}" not found for update.`;
                logger.warn(message);
                return res.status(404).json({ message });
            }
            
            logger.info(`Category "${NAME}" (ID: ${CATEGORY_ID}) updated successfully.`);
            return res.status(200).send({ success: `Category "${NAME}" updated successfully` });

        } catch (error: any) {
            if (error.name === 'ValidationError' || error.code === 11000) {
                 return next(new CustomError(`Validation error: ${error.message}`, 400));
            }
            logger.error(`Error updating category: ${error.message}`, { stack: error.stack, body: req.body });
            next(new CustomError('Error updating category.', 500));
        }
    }

    // Alterna el estado 'deleted' de una categoría (Soft Delete)
    public async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const user: any = req.user;
            const categoryId = req.body.id;

            if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
                logger.warn('Invalid or missing Category ID for deletion toggle.');
                return res.status(400).json({ message: 'Valid Category ID is required for deletion.' });
            }

            if (user?.role !== "Admin") {
                logger.warn(`Unauthorized attempt to delete category ID: ${categoryId} by user ID: ${user?.id || 'N/A'}`);
                return res.status(403).json({ message: `You are not authorized to delete categories.` });
            }

            // Operación atómica: encuentra por ID y actualiza el estado de 'deleted'
            const updatedCategory = await Category.findByIdAndUpdate(
                categoryId, 
                { $set: { deleted: !req.body.deleted } }, 
                { new: true }
            ).exec();

            if (!updatedCategory) {
                logger.warn(`Category ID ${categoryId} not found for deletion toggle.`);
                return res.status(404).json({ message: `Category with ID ${categoryId} not found.` });
            }

            logger.info(`Category "${updatedCategory.name}" (ID: ${updatedCategory._id}) deletion status toggled to: ${updatedCategory.deleted}`);
            return res.status(200).send({ success: `Category deleted status toggled for: ${updatedCategory.name}` });

        } catch (error: any) {
            logger.error(`Error deleting category ID ${req.body.id}: ${error.message}`, { stack: error.stack, body: req.body });
            next(new CustomError('Error deleting category.', 500));
        }
    }
}

export const categoryControllers = new CategoryControllers();
