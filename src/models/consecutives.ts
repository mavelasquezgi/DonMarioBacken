import mongoose, { model, Schema } from 'mongoose';

export interface ConsecutiveI extends mongoose.Document {
    nameCompany: string,
    idCompany: string,
    typeCompany: string,
    order: number,
    quote: number,
    product: number,
}

const ConsecutiveSchema = new Schema({
    nameCompany: { type: String, trim: true, required: true },
    idCompany: { type: String, trim: true, required: true },
    typeCompany: { type: String, trim: true, required: true },
    order: { type: Number, required: true },
    quote: { type: Number, required: true },
    product: { type: Number, required: true },
});

export default model<ConsecutiveI>('Consecutive', ConsecutiveSchema);