import { model, Schema, Document } from 'mongoose';


const paymentSchema = new Schema({
    dateTransaction: { type: Date, required: true },
    valueTransaction: { type: Number, required: true },
    metodTransaction: { type: String, required: true },
    fileSupport: { type: String, required: true }
});

export interface QuoteI extends Document {
    idQuote: string,
    idOrder?: string,
    company: string,
    idCompany: string,
    addressCompany: string,
    typeCompany: string,
    phoneCompany: string,
    clientNames: string,
    clientLastnames: string,
    documentClient?: string,
    idClient: Schema.Types.ObjectId,
    idUser: Schema.Types.ObjectId,
    addressClient: string,
    departmentClient: string,
    cityClient: string,
    phoneClient: string,
    emailClient: string,
    sendemail: boolean,
    sendwhatsapp: boolean,
    dateOrder: string,
    listProducts: [any],
    daysValid: number,
    deleted: boolean,
    content: object,
    type: string,
    partialPayments: [any],
    total: number,
    due_amount: number,
}

const QuoteSchema = new Schema(
    {
        idQuote: { type: String, trim: true, required: true, unique: true },
        idOrder: { type: String, trim: true, required: false, unique: true },
        company: { type: String, trim: true, required: true },
        idCompany: { type: String, trim: true, required: true },
        addressCompany: { type: String, trim: true, required: true },
        typeCompany: { type: String, trim: true, required: true },
        phoneCompany: { type: String, trim: true, required: true },
        clientNames: { type: String, trim: true, required: true },
        clientLastnames: { type: String, trim: true, required: true },
        documentClient: { type: String, trim: true, required: true },
        idClient: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
        idUser: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
        addressClient: { type: String, trim: true, required: true },
        departmentClient: { type: String, trim: true, required: true },
        cityClient: { type: String, trim: true, required: true },
        phoneClient: { type: String, trim: true, required: true },
        emailClient: { type: String, trim: true, require: true },
        sendemail: { type: Boolean, default: true },
        sendwhatsapp: { type: Boolean, default: true },
        dateOrder: { type: String, trim: true, required: true },
        listProducts: [{ type: Object, required: true }],
        daysValid: { type: Number, default: 3, required: true },
        deleted: { type: Boolean, required: true, default: false },
        content: { type: Object },
        type: { type: String, required: true, default: "QUOTE" },
        partialPayments: [{ type: paymentSchema, default: [], required: true }],
        total: { type: Number, trim: true, required: true, default: 0 },
        due_amount: { type: Number, trim: true, required: true, default: 0 }
    },
    { timestamps: true }
);

export default model<QuoteI>('Quote', QuoteSchema);



