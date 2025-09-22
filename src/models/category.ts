import mongoose, { model, Schema, Types } from 'mongoose';

// Usamos 'Types.ObjectId' para tipar correctamente la referencia al padre y los ancestros.
export interface CategoryI extends mongoose.Document {
    name: string,
    description: string,
    state: string,
    image: string,
    priority: number,
    deleted: boolean,
    
    // Lista de Adyacencia (Para fácil modificación de la jerarquía)
    parent?: Types.ObjectId | CategoryI | null;

    // Materialized Path (Para consultas de subárboles completos y breadcrumbs)
    ancestors: Types.ObjectId[];
}

const CategorySchema = new Schema(
    {
        name: { type: String, trim: true, required: true, unique: true, uppercase: true },
        description: { type: String, trim: true, required: true },
        state: { type: String, trim: true, required: true, default: "ACTIVE" },
        image: { type: String, trim: true, required: true },
        priority: { type: Number, required: true, default: 1 },
        deleted: { type: Boolean, required: true, default: false },

        // Referencia al padre (Mantiene la estructura de Adyacencia)
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
            index: true
        },
        
        // El campo Materialized Path: array de IDs de todos los ancestros, de raíz a padre.
        ancestors: [{
            type: Schema.Types.ObjectId,
            ref: 'Category',
            index: true // ¡Crucial para búsquedas rápidas de subárboles!
        }]
    },
    { timestamps: true }
);

/**
 * Hook pre-save: Calcula la ruta materializada (ancestors) solo para la categoría actual.
 * Ejecutado antes de guardar.
 */
CategorySchema.pre<CategoryI>('save', async function (next) {
    const category = this;

    // Solo ejecuta la lógica si el documento es nuevo O si el campo 'parent' ha sido modificado.
    if (!category.isNew && !category.isModified('parent')) {
        return next();
    }

    if (!category.parent) {
        category.ancestors = [];
        return next();
    }
    
    try {
        const CategoryModel = model<CategoryI>('Category');
        
        // Buscar el documento padre para obtener sus ancestros
        const parent = await CategoryModel.findById(category.parent).exec();

        if (!parent) {
            // Prevenimos guardar si el padre no existe.
            return next(new Error('Parent category not found or invalid.'));
        }

        // 1. Copiar todos los ancestros del padre.
        const newAncestors = [...parent.ancestors]; 
        
        // 2. Añadir el ID del padre a la lista.
        newAncestors.push(parent._id as Types.ObjectId); 

        // 3. Asignar la nueva ruta.
        category.ancestors = newAncestors;
        
        next();
    } catch (error: any) {
        next(error);
    }
});

/**
 * Hook post-save: Maneja la lógica de cascada para actualizar los ancestros de todos los descendientes.
 * Ejecutado DESPUÉS de guardar la categoría.
 */
CategorySchema.post<CategoryI>('save', async function (doc, next) {
    const category = doc;

    // Solo necesitamos hacer la cascada si el campo 'parent' ha sido modificado.
    // Usamos $isModified() aquí para acceder al estado ANTES de la operación de guardado.
    // Nota: El 'isModified' solo funciona en el 'pre' hook. Aquí en 'post' se usa una bandera
    // o se verifica la consistencia manual. Usaremos una bandera simple para simplificar la lógica
    // o simplemente ejecutaremos la actualización si el documento NO es nuevo.
    
    // Si la categoría es nueva, no tiene descendientes que actualizar.
    if (category.isNew) {
        return next();
    }

    // Lógica de cascada: Revisa si algún descendiente necesita actualización.
    try {
        const CategoryModel = model<CategoryI>('Category');
        
        // 1. Encontrar todos los descendientes que actualmente tienen a esta categoría en sus ancestros.
        const descendants = await CategoryModel.find({ ancestors: category._id }).exec();

        // 2. Si no hay descendientes, terminamos.
        if (descendants.length === 0) {
            return next();
        }

        // 3. Construir la nueva ruta de ancestros de esta categoría (actualizada).
        const newPath = [...category.ancestors, category._id];
        const oldPathLength = newPath.length - 1; // La longitud de la ruta hasta el padre (sin incluirse a sí misma)

        // 4. Actualizar todos los descendientes en una operación optimizada de Mongo (bulk update)
        const bulkOps = descendants.map((descendant) => {
            // Encontramos el índice donde comienza el viejo camino de la categoría actual.
            const oldIndex = descendant.ancestors.findIndex(id => id.equals(category._id as Types.ObjectId));
            
            // Creamos el nuevo array de ancestros combinando el camino antiguo (antes de la categoría actual)
            // con el nuevo camino de la categoría actual (newPath) y el resto del camino del descendiente.
            const newAncestors = [
                // Parte 1: El camino antes del padre original (Ancestors del abuelo)
                ...descendant.ancestors.slice(0, oldIndex), 
                // Parte 2: El nuevo camino de la categoría padre (incluida la categoría padre)
                ...newPath, 
                // Parte 3: El resto del camino (del descendiente hasta la hoja)
                ...descendant.ancestors.slice(oldIndex + 1)
            ];

            // Reemplazamos el array completo de ancestros.
            return {
                updateOne: {
                    filter: { _id: descendant._id },
                    update: { $set: { ancestors: newAncestors } },
                    // runValidators: true
                }
            };
        });

        // Ejecutar las operaciones de actualización masiva.
        if (bulkOps.length > 0) {
            await CategoryModel.bulkWrite(bulkOps);
        }

        next();
    } catch (error: any) {
        // En caso de error, el documento padre ya se guardó, pero registramos el error de cascada.
        console.error('Error in Materialized Path cascading update:', error);
        next(error);
    }
});

export default model<CategoryI>('Category', CategorySchema);
