import { model, Schema, Document } from 'mongoose';
import unidecode from 'unidecode';
import { PorterStemmerEs as PorterStemmerSpanish } from 'natural';
import { spanishStopWords } from '../helpers/helpers';

export interface ProductI extends Document {
    code: string;
    name: string;
    slug: string;
    mark: string;
    description: string;
    content: object;
    wheigth: number;
    categories: [string];
    image: string;
    state: string;
    featured: boolean;
    deleted: boolean;
    mshigh: number;
    mslong: number;
    msthickness: number;
    linkPageProvider: string;
    IVAPercent: number;
    searchKeywords: string[];       // Palabras clave normalizadas (minúsculas, sin tildes, sin caracteres especiales)
    stemmedKeywords: string[];      // Palabras clave con stemming
    exactSearchTerms: string[];     // Para búsquedas exactas (ej. "iPhone 15")
    userKeywords: string[];         // <-- ¡Nuevo campo para las palabras clave del usuario!
}

const ProductSchema = new Schema(
    {
        code: { type: String, trim: true, required: true, unique: true },
        name: { type: String, trim: true, required: true, uppercase: true },
        slug: { type: String, trim: true, required: true },
        mark: { type: String, trim: true, required: true },
        description: { type: String, trim: true, required: true },
        content: { type: Object, required: true },
        wheigth: { type: Number, required: true },
        categories: [{ type: String }],
        image: { type: String },
        state: { type: String, trim: true, required: true, default: "ACTIVE" },
        featured: { type: Boolean, required: true, default: false },
        deleted: { type: Boolean, required: true, default: false },
        mshigh: { type: Number, required: true },
        mslong: { type: Number, required: true },
        msthickness: { type: Number, required: true },
        linkPageProvider: { type: String },
        IVAPercent: { type: Number, required: true },
        searchKeywords: { type: [String], default: [] },
        stemmedKeywords: { type: [String], default: [] },
        exactSearchTerms: { type: [String], default: [] },
        userKeywords: { type: [String], default: [] }, // <-- Nuevo campo en el esquema
    },
    { timestamps: true }
);

function processTextForSearch(text: string): { keywords: string[], stemmed: string[], exactTerms: string[] } {
    const normalizedText = unidecode(text).toLowerCase().replace(/[^a-z0-9\s]/g, '');

    // Tokenización común
    const rawTokens = text.split(/\s+/).filter(token => token.length > 0);
    const normalizedTokens = normalizedText.split(/\s+/).filter(token => token.length > 0);

    const keywords: string[] = [];
    const stemmedTokens: string[] = [];
    const exactTerms: string[] = [];

    normalizedTokens.forEach(token => {
        if (!spanishStopWords.has(token)) {
            exactTerms.push(token);
        }
    });

    rawTokens.forEach(rawToken => {
        const normalized = unidecode(rawToken).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.length > 0 && !spanishStopWords.has(normalized)) {
            keywords.push(normalized);

            const stemmed = PorterStemmerSpanish.stem(normalized);
            stemmedTokens.push(stemmed);
        }
    });

    return {
        keywords: Array.from(new Set(keywords)),
        stemmed: Array.from(new Set(stemmedTokens)),
        exactTerms: Array.from(new Set(exactTerms))
    };
}

// --- Middleware para pre-procesar los campos de búsqueda antes de guardar ---
ProductSchema.pre('save', function(next) {
    if (this.isModified('name') || this.isModified('description') || this.isModified('mark') || this.isModified('userKeywords') || this.isNew) {
        let combinedText = '';
        if (this.name) combinedText += this.name + ' ';
        if (this.description) combinedText += this.description + ' ';
        if (this.mark) combinedText += this.mark + ' ';
        // ¡Incluye las userKeywords en el texto combinado!
        if (this.userKeywords && this.userKeywords.length) combinedText += this.userKeywords.join(' ') + ' ';

        const { keywords, stemmed, exactTerms } = processTextForSearch(combinedText);

        this.searchKeywords = keywords;
        this.stemmedKeywords = stemmed;
        this.exactSearchTerms = exactTerms;
    }
    next();
});

ProductSchema.index({
    name: 'text',
    description: 'text',
    mark: 'text',
    categories: 'text',
}, {
    name: 'product_text_index',
    weights: { // Puedes ajustar la ponderación de los campos
        name: 10,       // Más importante
        mark: 5,
        categories: 3,
        description: 1   // Menos importante
    },
    default_language: 'spanish' // Ayuda al operador $text a entender el idioma
});

// Índices para búsquedas eficientes en arrays de keywords y n-grams
ProductSchema.index({ searchKeywords: 1 });
ProductSchema.index({ stemmedKeywords: 1 });
ProductSchema.index({ exactSearchTerms: 1 }); // Nuevo índice

export default model<ProductI>('Product', ProductSchema);



