import mongoose, { Schema, model } from 'mongoose'

export interface TokenI extends mongoose.Document {
    _userId: mongoose.Schema.Types.ObjectId,
    token: string,
    createdAt: Date
}

const tokenSchema = new Schema({
    _userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now, expires: 43200 }
});

export default model<TokenI>('Token', tokenSchema);