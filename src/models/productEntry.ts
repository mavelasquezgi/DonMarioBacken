// models/ProductEntry.ts
import mongoose, { model, Schema, Document } from 'mongoose';

// Define the TypeScript Interface for ProductEntry
export interface ProductEntryI extends Document {
    entryType: 'receipt' | 'manual_add' | 'adjustment'; // Specific string literal types
    receipt?: mongoose.Types.ObjectId; // Use mongoose.Types.ObjectId for raw ID, optional
    company: mongoose.Types.ObjectId; // Use mongoose.Types.ObjectId
    location: mongoose.Types.ObjectId; // Use mongoose.Types.ObjectId
    user: mongoose.Types.ObjectId; // Use mongoose.Types.ObjectId
    quantity: number;
    unitPrice: number; // Assuming price is a number
    entryDate: Date;
    deleted: boolean; // Assuming this is a boolean flag for soft delete
    notes?: string; // Optional
    createdAt: Date; // Added by timestamps
    updatedAt: Date; // Added by timestamps
}

// Define the Mongoose Schema
const ProductEntrySchema = new Schema(
    {
        entryType: { // e.g., 'receipt', 'manual_add', 'adjustment'
            type: String,
            required: true,
            enum: ['COMPRA', 'DEVOLUCIÓN'] // Define types of entries
        },
        company: { // The company whose stock/record is affected
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        location: { // The product being entered
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: true
        },
        user: { // The user who recorded this specific entry
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        quantity: { // Quantity added in this specific entry (usually positive for incoming)
            type: Number,
            required: true,
            min: 0 // Assuming this model primarily tracks incoming/additions
        },
        unitCost: { // Price per unit of the product at the time of entry
            type: Number,
            required: true,
            min: 0
        },
        profitPercentage: { // Desired profit % *at the time of entry* (can be used to calculate suggested selling price)
            type: Number,
            required: true,
            min: 0
        },
        entryDate: { // The date this specific entry was recorded
            type: Date,
            required: true,
            default: Date.now
        },
        deleted: { // Soft delete flag
            type: Boolean,
            default: false
        },
        notes: { // Optional notes about this specific entry
            type: String,
            trim: true
        }
    },
    {
        timestamps: true // Adds createdAt and updatedAt fields automatically
    }
);

// Export the model using the specified style
export default model<ProductEntryI>('ProductEntry', ProductEntrySchema);