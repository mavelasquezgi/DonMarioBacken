import mongoose, { model, Schema } from 'mongoose';

export interface TownI extends mongoose.Document {
    state: string,
    country: string,
    id: string,
    cities: [string]
}

const TownSchema = new Schema({
    country: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    id: { type: String, trim: true, required: true, unique: true },
    cities: [String]
});

export default model<TownI>('Towns', TownSchema);