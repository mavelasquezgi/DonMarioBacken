import mongoose, { model, Schema, Document } from 'mongoose';

export interface TransferProductI extends Document {
    idProduct: mongoose.Schema.Types.ObjectId,
    idUser: mongoose.Schema.Types.ObjectId,
    originLocation: string,
    destinationLocation: string,
    quantity: number,
    date: Date,
    notes?: string
}

const TransferProductSchema = new Schema(
    {
        idProduct: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
        idUser: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
        originLocation: { type: String, trim: true, required: true },
        destinationLocation: { type: String, trim: true, required: true },
        quantity: { type: Number, required: true, min: 1 },
        date: { type: Date, default: Date.now },
        notes: { type: String, trim: true }
    },
    { timestamps: true }
);

export default model<TransferProductI>('TransferProduct', TransferProductSchema);