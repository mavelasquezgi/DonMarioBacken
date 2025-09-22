import { model, Schema, Document, Types } from 'mongoose';

// DTO para crear una nueva ubicación 
export interface CreateLocationDTO {
    idStore: Types.ObjectId,
    price: number;
    store_price?: number; // Opcional para el cliente si no siempre lo envía
    stock: number;
    discountPer?: number; // Opcional, si tiene un valor por defecto en el esquema
    unitDiscount?: number; // Opcional, si tiene un valor por defecto
    deliveryService?: boolean; // Opcional, si tiene un valor por defecto
    onStore?: boolean; // Opcional, si tiene un valor por defecto
    idProduct: Types.ObjectId; 
    numSales?: number; // Opcional, si tiene un valor por defecto
    numScore?: number; // Opcional, si tiene un valor por defecto
    deleted?: boolean; // Opcional, si tiene un valor por defecto
}

// DTO para actualizar una ubicación 
// Todos los campos son opcionales para permitir actualizaciones parciales
export interface UpdateLocationDTO {
    idStore: { type: Schema.Types.ObjectId, required: true, ref: 'Store' },
    price?: number;
    store_price?: number;
    stock?: number;
    discountPer?: number;
    unitDiscount?: number;
    deliveryService?: boolean;
    onStore?: boolean;
    idProduct: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
}

export interface LocationI extends Document {
    idStore: Schema.Types.ObjectId,
    price: number,
    store_price?: number, // Optional field for store price
    stock: number,
    discountPer: number,
    unitDiscount: number,
    deliveryService: boolean,
    onStore: boolean,
    numSales: number,
    numScore: number,
    idProduct: Schema.Types.ObjectId,
    deleted: boolean
}

const LocationFieldSchema = new Schema(
    {
        idStore: { type: Schema.Types.ObjectId, trim: true, required: true, ref: 'Store' },
        price: { type: Number, required: true },
        stock: { type: Number, required: true },
        store_price: { type: Number, required: true }, // Optional field for store price
        discountPer: { type: Number, default: 0, required: true },
        unitDiscount: { type: Number, default: 1, required: true },
        deliveryService: { type: Boolean, default: true, required: true },
        onStore: { type: Boolean, default: true, required: true },
        numSales: { type: Number, default: 0, required: true },
        numScore: { type: Number, default: 0, required: true },
        idProduct: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        deleted: { type: Boolean, default: false, required: true },
    },
    { timestamps: true }
);

LocationFieldSchema.index({ idProduct: 1, location: 1 }, { unique: true }); // Índice único para producto y ubicación

export default model<LocationI>('Location', LocationFieldSchema);



