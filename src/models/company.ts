import mongoose, { model, Schema } from 'mongoose';

export interface CompanyI extends mongoose.Document {
    name: string,
    nit: string,
    address: string,
    phone: string,
    email: string,
    deleted: boolean
}

const CompanySchema = new Schema({
    name: { type: String, trim: true, required: true },
    nit: { type: String, trim: true, required: true },
    address: { type: String, trim: true, required: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    deleted: { type: Boolean, default: false } // Soft delete flag
},
{
    timestamps: true // Adds createdAt and updatedAt fields
});

export default model<CompanyI>('Company', CompanySchema);