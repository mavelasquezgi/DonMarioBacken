import mongoose, { model, Schema } from 'mongoose';

export interface StoreI extends mongoose.Document {
    name: string,
    country: string,
    department: string,
    city: string,
    address: string,
    deleted: boolean,
    nit: string
}

const StoreSchema = new Schema(
    {
        name: { type: String, trim: true, required: true, unique: true },
        country: { type: String, trim: true, required: true, default: "Colombia" },
        department: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true },
        address: { type: String, trim: true, required: true },
        deleted: { type: Boolean, required: true, default: false },
        nit: { type: String, trim: true, required: false, default: null },
    },
    { timestamps: true }
);

export default model<StoreI>('Store', StoreSchema);


