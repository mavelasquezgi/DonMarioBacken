import mongoose, { model, Schema } from 'mongoose';

export interface NominatorI extends mongoose.Document {
    name: string,
    state: string,
    deleted: boolean
}

const NominatorSchema = new Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        state: { type: String, required: true, default: "ACTIVE", trim: true },
        deleted: { type: Boolean, required: true, default: false }
    },
    { timestamps: true }
);

export default model<NominatorI>('Nominator', NominatorSchema);


