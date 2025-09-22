import mongoose, { model, Schema } from 'mongoose';

export interface MarkI extends mongoose.Document {
    name: string,
    image: string,
    priority: number,
    deleted: boolean
}

const MarkSchema = new Schema(
    {
        name: { type: String, trim: true, required: true, unique: true },
        image: { type: String, trim: true, required: true },
        priority: { type: Number, required: true, default: 1 },
        deleted: { type: Boolean, required: true, default: false }
    },
    { timestamps: true }
);

export default model<MarkI>('Mark', MarkSchema);


