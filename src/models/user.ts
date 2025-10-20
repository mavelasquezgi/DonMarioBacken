import { model, Schema, Document, Types } from 'mongoose' // Importamos Types
import { UserRole } from './role';

export interface IUSer extends Document {
    _id: string;
    documentType: string;
    document: number;
    names: string;
    lastnames: string;
    email: string;
    password: string;
    phone: number;
    gender?: string; // Hacemos este campo opcional
    
    // Campos de dirección
    country: string;
    department: string;
    city: string;
    address: string;

    // Campos de estado de cuenta
    verification: boolean;
    role: UserRole; // Usamos la enumeración aquí
    deleted: boolean;

    // Campos específicos para negocios (ferreterías, proveedores)
    businessName?: string;
    businessRegistrationNumber?: string;

    // Campos específicos para vendedores
    ranking?: number;
    commissionPercentage?: number;

    // AÑADIDO: Campo para la relación Muchos a Muchos (solo para roles STORE)
    sellerIds?: Types.ObjectId[];
}

const userSchema = new Schema(
    {
        documentType: { type: String, trim: true, required: true },
        document: { type: Number, required: true, unique: true },
        names: { type: String, trim: true, required: true },
        lastnames: { type: String, trim: true, required: true },
        email: { type: String, trim: true, required: true, unique: true },
        password: { type: String, trim: true, required: true },
        phone: { type: Number, required: true },
        gender: { type: String, trim: true, required: false }, // Opcional
        
        country: { type: String, trim: true, required: true, default: "Colombia" },
        department: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true },
        address: { type: String, trim: true, required: true },
        
        verification: { type: Boolean, default: true },
        role: { 
            type: String, 
            trim: true, 
            required: true, 
            enum: Object.values(UserRole) // Validamos con la enumeración
        },
        deleted: { type: Boolean, default: false },

        // Campos específicos para ferreterías y proveedores
        businessName: { type: String, trim: true },
        businessRegistrationNumber: { type: String, trim: true, unique: true, sparse: true },

        // Campos específicos para vendedores
        ranking: { type: Number, default: 0 },
        commissionPercentage: { type: Number, default: 0 },

        // AÑADIDO: Lista de IDs de Vendedores asociados a esta Ferretería (Relación M:N)
        sellerIds: [{
            type: Types.ObjectId, // Referencia al mismo modelo 'User'
            ref: 'User',
            required: false // Es opcional para otros roles
        }],
    },
    { timestamps: true }
);

userSchema.index({ documentType: 1, document: 1 }, { unique: true });

export default model<IUSer>('User', userSchema);