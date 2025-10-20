import { Request, Response } from 'express'
import Product from '../models/product';
import Location from '../models/locations';
import config from '../config/config';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import PdfPrinter from 'pdfmake';
import { generateWordVariations, getConsecutive, isValidString, pathFolders, singularizarWord, spanishStopWords, typeObject } from '../helpers/helpers';
import { PipelineStage } from 'mongoose';
import unidecode from 'unidecode';
import { PorterStemmerEs as PorterStemmerSpanish } from 'natural';
import logger from '../helpers/winstonLogger'; // Keeping the original import path
import Store, { StoreI } from '../models/store';

pdfMake.vfs = pdfFonts.vfs;

function validate(field: string) {
    let errors: string[] = ["find", "select", "drop", "update", "href", "delete", "update"]
    let valid: boolean = true
    for (let err in errors) {
        try {
            let conten = field.toLowerCase().indexOf(errors[err])
            if (conten != -1) {
                valid = false;
            }
        } catch (error) {
            valid = false;
            console.error("valid", valid, err, error, field);
        }
    }
    return valid
}

// Función para normalizar y tokenizar la consulta del usuario
function processSearchQuery(query: string): { keywords: string[], stemmed: string[], exactTerms: string[] } {
    const exactNormalizedText = unidecode(query).toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const exactTokens = exactNormalizedText.split(/\s+/).filter(token => token.length > 0);

    const rawTokens = query.split(/\s+/).filter(token => token.length > 0);
    const keywords: string[] = [];
    const stemmedTokens: string[] = [];

    rawTokens.forEach(rawToken => {
        const normalized = unidecode(rawToken).toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normalized.length > 0 && !spanishStopWords.has(normalized)) {
            keywords.push(normalized);
            stemmedTokens.push(PorterStemmerSpanish.stem(normalized));
        }
    });

    return {
        keywords: Array.from(new Set(keywords)),
        stemmed: Array.from(new Set(stemmedTokens)),
        exactTerms: Array.from(new Set(exactTokens))
    };
}

export async function createProduct(req: Request, res: Response): Promise<Response> {
    const { name, description, mark, content, mshigh, msthickness, mslong, wheigth, IVAPercent, categories, linkPageProvider } = req.body;
    const USER_KEYWORDS_RAW: string | string[] | undefined = req.body.userKeywords;
    let USER_KEYWORDS: string[] = [];

    // --- 1. PRE-PROCESAMIENTO DE PALABRAS CLAVE ---
    if (USER_KEYWORDS_RAW) {
        if (typeof USER_KEYWORDS_RAW === 'string') {
            USER_KEYWORDS = USER_KEYWORDS_RAW.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        } else if (Array.isArray(USER_KEYWORDS_RAW)) {
            USER_KEYWORDS = USER_KEYWORDS_RAW.map(kw => kw.trim()).filter(kw => kw.length > 0);
        }
    }

    // Generación de variaciones y combinación de palabras clave
    const arrayVariations = generateWordVariations(name);
    USER_KEYWORDS = USER_KEYWORDS.concat(arrayVariations);

    let valideName: boolean = validate(name);
    let valideDescrip: boolean = validate(description);

    if (!valideName || !valideDescrip) {
        const message = "El contenido de uno de los campos (nombre o descripción) no es válido.";
        logger.warn(`Invalid field content for product creation: ${message}`);
        return res.status(400).json(message);
    }

    // --- 2. VERIFICACIÓN DE EXISTENCIA (antes de obtener el consecutivo) ---
    try {
        // Verifica si ya existe un producto con ese nombre
        const existingProductByName = await Product.findOne({ name: name });

        if (existingProductByName) {
            const message = `Ya existe un producto con el nombre ${name}.`;
            logger.warn(message);
            return res.status(400).json({ message });
        }

        // --- 3. OBTENCIÓN DEL CONSECUTIVO Y CREACIÓN DEL OBJETO DE DATOS ---
        // Se ejecuta SOLO si no hay producto existente por nombre
        const code = await getConsecutive(typeObject.product, config.COMPANY.NAME, config.COMPANY.ID, config.COMPANY.TYPE);

        // Se verifica si el consecutivo generado ya existe (aunque es raro, es una buena práctica)
        const existingProductByCode = await Product.findOne({ code: code });
        if (existingProductByCode) {
            const message = `El código consecutivo ${code} ya está en uso. Reintente.`;
            logger.error(message);
            // NO se envía el consecutivo al frontend, solo el error.
            return res.status(500).json({ message: "Error al generar código único. Reintente." });
        }

        const NEWPRODUCT_DATA = {
            code: code, // Código consecutivo
            name: name,
            mark: mark,
            slug: name.replace(/ /g, '-').replace(/[^\w-]+/g, ''),
            description: description,
            content: JSON.parse(content),
            mshigh: mshigh,
            msthickness: msthickness,
            mslong: mslong,
            wheigth: wheigth,
            IVAPercent: IVAPercent,
            categories: JSON.parse(categories),
            image: req.file?.path.split('/').pop(),
            linkPageProvider: linkPageProvider,
            userKeywords: USER_KEYWORDS,
        };

        // --- 4. GUARDADO DEL PRODUCTO ---
        const PRODUCT = new Product(NEWPRODUCT_DATA);
        await PRODUCT.save(); // Aquí se dispara el middleware pre('save')

        logger.info(`Producto ${name} creado exitosamente con código ${code}, ID: ${PRODUCT._id}`);
        return res.status(201).send({ success: `Producto ${name} creado exitosamente con código ${code}`, idProduct: PRODUCT._id });

    } catch (error: any) {
        // Este bloque captura errores de .findOne, .save() y JSON.parse()
        logger.error(`Error al crear o guardar el producto ${name}: ${error.message}`, { stack: error.stack });
        // Error específico para JSON.parse()
        if (error instanceof SyntaxError) {
            return res.status(400).json({ message: "Error en el formato JSON de 'content' o 'categories'." });
        }
        return res.status(500).json({ message: "Error interno del servidor al crear el producto." });
    }
}

export async function createProductManual(req: Request, res: Response): Promise<Response> {
    const NAME = req.body.name;
    const DESCRIPTION = req.body.description;

    // Obtener y procesar las userKeywords de la misma manera que en createProduct
    const USER_KEYWORDS_RAW: string | string[] | undefined = req.body.userKeywords;
    let USER_KEYWORDS: string[] = [];

    if (USER_KEYWORDS_RAW) {
        if (typeof USER_KEYWORDS_RAW === 'string') {
            USER_KEYWORDS = USER_KEYWORDS_RAW.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        } else if (Array.isArray(USER_KEYWORDS_RAW)) {
            USER_KEYWORDS = USER_KEYWORDS_RAW.map(kw => kw.trim()).filter(kw => kw.length > 0);
        }
    }

    let valideName: boolean = validate(NAME);
    let valideDescrip: boolean = validate(DESCRIPTION);

    const NEWPRODUCT_DATA: any = { // Usa un nombre más descriptivo
        code: await getConsecutive(typeObject.product, config.COMPANY.NAME, config.COMPANY.ID, config.COMPANY.TYPE),
        name: req.body.name,
        mark: req.body.mark,
        slug: req.body.name.replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        // Nota: aquí description se asigna a req.body.name, ¿es intencional?
        // Si no, debería ser req.body.description
        description: req.body.description, // Cambiado de req.body.name a req.body.description
        content: {}, // Predeterminado
        mshigh: 0, // Predeterminado
        msthickness: 0, // Predeterminado
        mslong: 0, // Predeterminado
        wheigth: 1, // Predeterminado
        IVAPercent: req.body.IVAPercent,
        categories: JSON.parse(req.body.categories),
        image: 'default.jpg', // Predeterminado
        linkPageProvider: "", // Predeterminado
        state: "INACTIVE", // Predeterminado
        userKeywords: USER_KEYWORDS, // <-- ¡Asigna las palabras clave del usuario aquí!
    }

    if (valideName && valideDescrip) {
        const PRODUCT = new Product(NEWPRODUCT_DATA); // Crea la instancia con los datos

        const RESULTSEARCH: any = await Product.find({ $and: [{ name: NAME }] });
        const RESULTSEARCH2: any = await Product.find({ $and: [{ code: NEWPRODUCT_DATA.code }] }); // Usa NEWPRODUCT_DATA.code

        if (RESULTSEARCH.length !== 0 || RESULTSEARCH2.length !== 0) {
            let message = `Ya existe un producto con el nombre ${NAME} o con el código ${NEWPRODUCT_DATA.code}`;
            logger.warn(message);
            return res.status(400).json(message);
        } else {
            try {
                await PRODUCT.save(); // El middleware pre('save') se activará aquí
                logger.info(`Producto manual ${NAME} creado exitosamente con código ${NEWPRODUCT_DATA.code}, ID: ${PRODUCT._id}`);
                return res.status(200).send({ success: `Producto ${NAME} creado exitosamente con código ${NEWPRODUCT_DATA.code}`, idProduct: PRODUCT._id });
            } catch (error) {
                logger.error(`Error al guardar el producto manual: ${error}`); // Cambiado console.error a logger.error
                return res.status(500).json({ message: "Error interno del servidor al crear el producto manualmente." });
            }
        }
    } else {
        let message = "El contenido de uno de los campos no es válido";
        logger.warn(`Invalid field content for manual product creation: ${message}`);
        return res.status(400).json(message);
    }
}

export async function editProduct(req: Request, res: Response): Promise<Response> {
    const CODE = req.body.code as string; // Asegura el tipo
    const NAME = req.body.name as string;
    const DESCRIPTION = req.body.description as string;
    const USER_KEYWORDS_RAW: string | string[] | undefined = req.body.userKeywords; // Nuevo: userKeywords

    let USER_KEYWORDS: string[] = [];
    if (USER_KEYWORDS_RAW) {
        if (typeof USER_KEYWORDS_RAW === 'string') {
            USER_KEYWORDS = USER_KEYWORDS_RAW.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        } else if (Array.isArray(USER_KEYWORDS_RAW)) {
            USER_KEYWORDS = USER_KEYWORDS_RAW.map(kw => kw.trim()).filter(kw => kw.length > 0);
        }
    }

    // Validar campos de entrada
    let valideName: boolean = validate(NAME);
    let valideDescrip: boolean = validate(DESCRIPTION);
    let valideCode: boolean = validate(CODE); // Es buena práctica validar el código también

    if (!valideName || !valideDescrip || !valideCode) { // Invertir la lógica para más claridad
        logger.warn(`Invalid field content during product edit for code ${CODE}. Name valid: ${valideName}, Description valid: ${valideDescrip}, Code valid: ${valideCode}`);
        return res.status(400).json({ message: "El contenido de uno o más campos (nombre, descripción, código) no es válido." });
    }

    try {
        // 1. Buscar el producto existente por su código
        const existingProduct = await Product.findOne({ code: CODE });

        if (!existingProduct) {
            logger.warn(`Attempted to edit non-existent product with code: ${CODE}`);
            return res.status(404).json({ message: `No existe un producto con el código ${CODE}.` }); // Cambiado a 404
        }

        // 2. Preparar los datos para la actualización
        const productUpdateData: any = {
            mark: req.body.mark,
            name: NAME, // Usar la variable validada
            slug: NAME.replace(/ /g, '-').replace(/[^\w-]+/g, ''),
            description: DESCRIPTION, // Usar la variable validada
            content: JSON.parse(req.body.content || '{}'), // Manejar si content no viene
            mshigh: req.body.mshigh,
            msthickness: req.body.msthickness,
            mslong: req.body.mslong,
            wheigth: req.body.wheigth,
            categories: JSON.parse(req.body.categories || '[]'), // Manejar si categories no viene
            state: req.body.state,
            featured: req.body.featured,
            linkPageProvider: req.body.linkPageProvider,
            IVAPercent: req.body.IVAPercent,
            userKeywords: USER_KEYWORDS, // <-- ¡Asigna las palabras clave del usuario aquí!
        };

        // 3. Manejo de la imagen (solo si se sube una nueva)
        if (req.file?.path) {
            const newImageFileName = req.file.path.split('/').pop();
            if (newImageFileName) {
                // Eliminar la imagen antigua si existe y no es la predeterminada 'default.jpg'
                if (existingProduct.image && existingProduct.image !== 'default.jpg') {
                    const oldImagePath = `${config.PATH.URLIMAGESPRODUCT}/${existingProduct.image}`; // Ajusta la ruta a tu directorio de imágenes
                    fs.unlink(oldImagePath, (err) => {
                        if (err) {
                            logger.error(`Error al eliminar la imagen antigua ${oldImagePath} para producto ${CODE}:`, err);
                            // Decide si quieres retornar un error aquí o solo loguearlo
                        } else {
                            logger.info(`Imagen antigua ${oldImagePath} eliminada exitosamente para producto ${CODE}.`);
                        }
                    });
                }
                productUpdateData.image = newImageFileName;
            }
        }

        // 4. Actualizar el producto
        // Mongoose 7+ .updateOne no dispara pre/post save middleware por defecto.
        // Si necesitas que el middleware de preprocesamiento se dispare,
        // debes usar findOneAndUpdate o cargar el documento, modificarlo y luego guardarlo.
        // Para nuestro caso, el middleware de preprocesamiento `pre('save')`
        // necesita ejecutarse para actualizar los campos de búsqueda.
        // Entonces, lo haremos de forma que el middleware se dispare.

        // Actualizar los campos del documento existente
        Object.assign(existingProduct, productUpdateData);

        // Guardar el documento. Esto disparará el middleware pre('save')
        // que recalculará searchKeywords, stemmedKeywords, nGrams, y exactSearchTerms.
        await existingProduct.save();

        logger.info(`Producto ${NAME} (código: ${CODE}) actualizado exitosamente. ID: ${existingProduct._id}`);
        return res.status(200).send({ success: `Producto ${NAME} actualizado exitosamente con código ${CODE}`, idProduct: existingProduct._id });

    } catch (error) {
        logger.error(`Error al actualizar el producto con código ${CODE}:`, error);
        return res.status(500).json({ message: "Error interno del servidor al actualizar el producto." });
    }
}

export async function editProductNotFile(req: Request, res: Response): Promise<Response> {
    const CODE = req.body.code as string;
    const NAME = req.body.name as string;
    const DESCRIPTION = req.body.description as string;
    const USER_KEYWORDS_RAW: string | string[] | undefined = req.body.userKeywords; // **¡Nuevo: userKeywords!**
    logger.info(`Received request to edit product (no file): ${JSON.stringify(req.body)}`);

    let USER_KEYWORDS: string[] = [];
    if (USER_KEYWORDS_RAW) {
        if (typeof USER_KEYWORDS_RAW === 'string') {
            USER_KEYWORDS = USER_KEYWORDS_RAW.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        } else if (Array.isArray(USER_KEYWORDS_RAW)) {
            USER_KEYWORDS = USER_KEYWORDS_RAW.map(kw => kw.trim()).filter(kw => kw.length > 0);
        }
    }

    // **Validar campos de entrada**
    let valideName: boolean = validate(NAME);
    let valideDescrip: boolean = validate(DESCRIPTION);
    let valideCode: boolean = validate(CODE);

    logger.info(`Validation results for product edit (no file) - Name: ${valideName}, Description: ${valideDescrip}, Code: ${valideCode}`);

    if (!valideName || !valideDescrip || !valideCode) {
        logger.warn(`Invalid field content during product edit (no file) for code ${CODE}.`);
        return res.status(400).json({ message: "El contenido de uno o más campos (nombre, descripción, código) no es válido." });
    }

    try {
        // **1. Buscar el producto existente por su código**
        const existingProduct = await Product.findOne({ code: CODE });

        if (!existingProduct) {
            logger.warn(`Attempted to edit non-existent product (no file) with code: ${CODE}`);
            return res.status(404).json({ message: `No existe un producto con el código ${CODE}.` });
        }

        // **2. Preparar los datos para la actualización**
        const productUpdateData: any = {
            mark: req.body.mark,
            name: NAME,
            slug: NAME.replace(/ /g, '-').replace(/[^\w-]+/g, ''),
            description: DESCRIPTION,
            content: JSON.parse(req.body.content || '{}'), // Manejar si content no viene
            mshigh: req.body.mshigh,
            msthickness: req.body.msthickness,
            mslong: req.body.mslong,
            wheigth: req.body.wheigth,
            categories: JSON.parse(req.body.categories || '[]'), // Manejar si categories no viene
            state: req.body.state,
            featured: req.body.featured,
            linkPageProvider: req.body.linkPageProvider,
            IVAPercent: req.body.IVAPercent,
            userKeywords: USER_KEYWORDS, // **¡Asigna las palabras clave del usuario aquí!**
        };

        // **3. Actualizar el documento existente y disparar el middleware `pre('save')`**
        // Object.assign copiará las propiedades de productUpdateData a existingProduct
        Object.assign(existingProduct, productUpdateData);

        // Guardar el documento. Esto **disparará** el middleware pre('save')
        // que recalculará searchKeywords, stemmedKeywords, nGrams, y exactSearchTerms.
        await existingProduct.save();

        logger.info(`Product (no file) ${NAME} with code ${CODE} updated successfully. ID: ${existingProduct._id}`);
        return res.status(200).send({ success: `Producto ${NAME} actualizado exitosamente con código ${CODE}`, idProduct: existingProduct._id });

    } catch (error) {
        logger.error(`Error updating product (no file) with code ${CODE}:`, error); // Cambiado console.error a logger.error
        return res.status(500).json({ message: "Error interno del servidor al actualizar el producto sin archivo." });
    }
}

export async function products(req: Request, res: Response): Promise<Response> {
    try {
        const locationParam = req.params.location;

        // Asegúrate de que locationParam exista, si es un requisito
        if (!locationParam) {
            logger.warn("El parámetro 'location' es requerido para obtener productos.");
            return res.status(400).json({ message: "El parámetro 'location' es requerido." });
        }

        logger.info(`Fetching products for location: ${locationParam}`);

        const listProducts = await Product.aggregate([
            {
                $match: {
                    // Mantener el estado activo y no eliminado para los productos base
                    state: "ACTIVE",
                    deleted: false
                }
            },
            {
                $lookup: {
                    from: 'locations', // Asegúrate de que 'locations' sea el nombre correcto de la colección
                    localField: "_id",
                    foreignField: "idProduct",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$location", locationParam] }, // Usar la variable locationParam directamente
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "locations"
                }
            },
            {
                // Este $match reemplaza el .filter() en el código JavaScript
                // Solo incluye productos que tengan al menos una ubicación que cumpla los criterios del lookup
                $match: {
                    "locations.0": { $exists: true } // Verifica que el array 'locations' no esté vacío
                }
            },
            {
                // Ordenar por la fecha de actualización y luego por nombre
                $sort: { updatedAt: -1, name: 1 } // Primero por fecha de actualización, luego por nombre ascendente
            }
        ]);

        logger.info(`Successfully retrieved ${listProducts.length} products for location: ${locationParam}`);
        return res.status(200).json(listProducts);

    } catch (error) {
        logger.error(`Error al obtener la lista de productos para la ubicación: ${req.params.location}: ${error}`); // Cambiado console.error a logger.error
        return res.status(500).json({ message: "Error interno del servidor al obtener productos." });
    }
}

export async function productsAdmin(req: Request, res: Response): Promise<Response> {
    try {
        const user = req.user;
        const userRole = user?.role;
        const userNit = user?.businessRegistrationNumber;

        // 1. Paginación
        const pageNumber = parseInt(req.query.page as string, 10) || 1;
        const pageSize = parseInt(req.query.quantity as string, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const limit = Math.max(0, pageSize);

        let storeId: ObjectId | null = null;
        let shouldFilterByStore = false;

        logger.info(`productsAdmin request: page=${pageNumber}, quantity=${pageSize}, userRole=${userRole || 'N/A'}, userNit=${userNit || 'N/A'}`);

        // 2. LÓGICA DE FILTRADO DE TIENDA BASADA EN EL ROL (para filtrar LOCATIONS)

        if (userRole && userRole.toUpperCase() !== 'ADMIN') {
            shouldFilterByStore = true;
        }

        if (shouldFilterByStore && userNit) {
            const store = await Store.findOne({ nit: userNit, deleted: false }).select('_id').lean();

            if (store) {
                storeId = new ObjectId(store._id.toString());
                logger.info(`Found storeId ${storeId.toString()} for user NIT ${userNit}`);
            } else {
                logger.warn(`Store not found for user NIT ${userNit}. Locations array will be empty.`);
            }
        }

        // --- INICIO Filtros de Query Params (para filtrar PRODUCTOS) ---
        const queryParams = req.query;
        const matchConditions: any[] = [];
        const parseBoolean = (value: any): boolean | undefined => {
            if (value === 'true') return true;
            if (value === 'false') return false;
            return undefined;
        };
        // ... (Tu lógica de filtrado de queryParams como antes) ...
        if (queryParams.code) matchConditions.push({ code: { $regex: queryParams.code, $options: 'i' } });
        if (queryParams.mark) matchConditions.push({ mark: { $regex: queryParams.mark, $options: 'i' } });
        if (queryParams.state) matchConditions.push({ state: queryParams.state });

        const featured = parseBoolean(queryParams.featured);
        if (featured !== undefined) matchConditions.push({ featured });

        const deleted = parseBoolean(queryParams.deleted);
        if (deleted !== undefined) matchConditions.push({ deleted });

        const ivaPercent = parseFloat(queryParams.IVAPercent as string);
        if (!isNaN(ivaPercent)) {
            matchConditions.push({ IVAPercent: { $gte: ivaPercent } });
        }
        if (queryParams.categories) {
            const categoriesToFilter = Array.isArray(queryParams.categories)
                ? queryParams.categories.map(cat => cat.toString().trim()).filter(Boolean)
                : (queryParams.categories as string).split(',').map(cat => cat.trim()).filter(Boolean);
            if (categoriesToFilter.length > 0) {
                matchConditions.push({ categories: { $in: categoriesToFilter } });
            }
        }
        // --- FIN Filtros de Query Params ---

        // 3. Construcción del pipeline
        const pipeline: PipelineStage[] = [];

        // 🔑 SOLO AÑADIR EL FILTRO SI HAY CONDICIONES DE QUERY PARAMS
        if (matchConditions.length > 0) {
            pipeline.push({ $match: { $and: matchConditions } });
            logger.info(`Match conditions applied: ${JSON.stringify(matchConditions)}`);
        }
        // Si matchConditions está vacío, el pipeline comienza vacío, cargando todos los productos.

        // Etapa 1: Lookup y Filtrado/Proyección de Locations 
        pipeline.push({
            $lookup: {
                from: 'locations',
                localField: '_id',
                foreignField: 'idProduct',
                as: 'locations',
                pipeline: [
                    // ESTE ES EL FILTRO CLAVE: Limita las locations devueltas en el array 'locations'.
                    ...(shouldFilterByStore && storeId ? [{ $match: { idStore: storeId } }] : []),

                    // B. LOOKUP ANIDADO: Obtener el nombre de la tienda
                    {
                        $lookup: {
                            from: 'stores',
                            localField: 'idStore',
                            foreignField: '_id',
                            as: 'storeInfo'
                        }
                    },
                    { $unwind: { path: '$storeInfo', preserveNullAndEmptyArrays: true } },
                    {
                        $replaceWith: {
                            $mergeObjects: [
                                "$$ROOT",
                                { store_name: "$storeInfo.name" }
                            ]
                        }
                    },
                    { $project: { storeInfo: 0 } }
                ]
            }
        });

        // 🛑 No se añade ningún $match aquí para no eliminar productos.

        // Etapa 2: Proyección y Paginación
        pipeline.push(
            {
                $project: {
                    // ... (Campos de proyección existentes) ...
                    _id: 1,
                    name: 1,
                    mark: 1,
                    image: 1,
                    state: 1,
                    deleted: 1,
                    featured: 1,
                    code: 1,
                    description: 1,
                    wheigth: 1,
                    IVAPercent: 1,
                    linkPageProvider: 1,
                    contentArray: 1,
                    categories: 1,
                    locations: 1, // Array filtrado o completo.
                    content: 1
                }
            },
            {
                $facet: {
                    products: [{ $skip: skip }, { $limit: limit }],
                    total: [{ $count: 'total' }]
                }
            }
        );

        const result = await Product.aggregate(pipeline).exec();
        const products = result[0]?.products || [];
        const total = result[0]?.total[0]?.total || 0;

        logger.info(`Successfully retrieved ${products.length} products for admin, total count: ${total}`);
        return res.status(200).json({ total, products });

    } catch (error) {
        logger.error('Error in productsAdmin:', error);
        return res.status(500).json({ message: "Error interno del servidor al obtener productos para administración." });
    }
}

export async function productsManual(req: Request, res: Response): Promise<Response> {
    try {
        // Establecer un valor predeterminado para location si no se proporciona
        const locationParam = req.params.location || "default";

        logger.info(`Fetching manual products for location: ${locationParam}`);

        const listProducts = await Location.aggregate([
            {
                $match: {
                    deleted: false,
                    location: locationParam
                }
            },
            {
                $lookup: {
                    from: 'products', // Asegúrate de que 'products' sea el nombre *real* de tu colección de productos en MongoDB
                    localField: 'idProduct',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                // Unwind el array productDetails.
                // preserveNullAndEmptyArrays: false asegura que solo pasen documentos
                // que realmente tienen un idProduct válido y se encontró un producto.
                $unwind: {
                    path: '$productDetails',
                    preserveNullAndEmptyArrays: false // Solo mantén las entradas que tienen un producto
                }
            },
            {
                // Si el producto enlazado fue 'deleted: true' o 'state: "INACTIVE"', podemos filtrarlo aquí.
                // Esto asegura que solo mostramos productos activos y no eliminados, incluso si la Location los referencia.
                $match: {
                    'productDetails.deleted': false,
                    //'productDetails.state': 'ACTIVE'
                }
            },
            {
                $project: {
                    // **Campos CRUCIALES para el FILTRADO en el frontend (_filterProductsByKeywords):**
                    _id: '$productDetails._id', // Siempre necesario para identificar
                    name: '$productDetails.name', // Para el searchableString y visualización
                    mark: '$productDetails.mark', // Para el searchableString y visualización
                    categories: '$productDetails.categories', // Para el searchableString
                    exactSearchTerms: '$productDetails.exactSearchTerms', // Para el searchableString
                    searchKeywords: '$productDetails.searchKeywords', // Para el searchableString
                    stemmedKeywords: '$productDetails.stemmedKeywords', // Para el searchableString
                    userKeywords: '$productDetails.userKeywords', // Para el searchableString

                    // **Campos necesarios para la LÓGICA DE NEGOCIO y VISUALIZACIÓN en la tabla/selección:**
                    code: '$productDetails.code', // Útil para mostrar en la tabla o detalles
                    IVAPercent: '$productDetails.IVAPercent', // Necesario para calcular el IVA en el frontend

                    // **La información de la ubicación se encapsula en un array 'locations'**
                    locations: [{
                        _id: '$_id', // El _id del documento de Location
                        location: '$location', // La ubicación específica
                        price: '$price', // Precio del producto en esta ubicación
                        stock: '$stock', // Stock del producto en esta ubicación
                        discountPer: '$discountPer', // Descuento por porcentaje
                        unitDiscount: '$unitDiscount', // Descuento por unidad
                        store_price: '$store_price', // Precio de la tienda
                    }]
                }
            },
            {
                $sort: { name: 1 } // Ordena por nombre del producto ascendente
            }
        ]);

        logger.info(`Successfully retrieved ${listProducts.length} manual products for location: ${locationParam}`);
        return res.status(200).json(listProducts);

    } catch (error) {
        logger.error(`Error fetching manual products for location ${req.params.location}: ${error}`); // Cambiado console.error a logger.error
        return res.status(500).send({ message: 'Error interno del servidor al obtener productos manuales.' });
    }
}

export async function getProductsWithLocations(req: Request, res: Response): Promise<Response> {
    try {
        // 1. Recuperar parámetros de consulta y establecer límite de seguridad
        const { search, limit = 200 } = req.query; 
        
        const limitNum = Math.min(parseInt(limit as string), 500); 

        const searchQuery = (search as string || '').trim();
        let productMatch: any = { deleted: false };
        
        // 2. Separar el texto de búsqueda en palabras clave, como hace el frontend
        const keywords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);

        if (keywords.length >= 1) {
            // El frontend requiere al menos 3 caracteres, pero el backend debe ser flexible.
            // Si el frontend está migrado, keywords.length nunca será 1 o 2 a menos que sea una cadena vacía.

            // 🚀 IMPLEMENTACIÓN DE LÓGICA "TODAS LAS PALABRAS DEBEN COINCIDIR"
            // productMatch.$and contendrá un elemento de búsqueda ($or) por cada palabra clave.
            productMatch.$and = keywords.map(keyword => {
                // Crear una expresión regular para la palabra clave actual
                const keywordRegex = new RegExp(keyword, 'i');
                
                // Crear un filtro $or para buscar la palabra clave en cualquiera de los 8 campos
                return {
                    $or: [
                        { name: { $regex: keywordRegex } },          
                        { code: { $regex: keywordRegex } },          
                        { mark: { $regex: keywordRegex } },          
                        { categories: { $regex: keywordRegex } },    
                        { exactSearchTerms: { $regex: keywordRegex } }, 
                        { searchKeywords: { $regex: keywordRegex } },   
                        { stemmedKeywords: { $regex: keywordRegex } },  
                        { userKeywords: { $regex: keywordRegex } }      
                    ]
                };
            });

        } else if (searchQuery.length > 0) {
            // Caso de borde: si el usuario introduce solo espacios, devolvemos vacío
             return res.status(200).json({ products: [] });
        }


        const pipeline: PipelineStage[] = [
            // 3. Filtrar Productos base: ahora usa $and (si hay keywords) y deleted: false
            { $match: productMatch },
            
            // 4. Ordenación por defecto
            { $sort: { name: 1 } }, 
            
            // 5. Aplicar el Límite de Seguridad
            { $limit: limitNum }, 

            // 6. Lookup para obtener las ubicaciones (locations)
            {
                $lookup: {
                    from: 'locations', 
                    localField: '_id',
                    foreignField: 'idProduct',
                    as: 'locations',
                    pipeline: [
                        // Solo ubicaciones activas y con stock > 0
                        { $match: { deleted: false, stock: { $gt: 0 } } },
                        // Si necesita el storeInfo, debe agregarlo aquí
                    ]
                }
            },
            // 7. Eliminar productos sin stock disponible en ninguna ubicación (después del lookup)
            { $match: { locations: { $ne: [] } } },
            
            // 8. Proyección final
            { 
                $project: { 
                    _id: 1, name: 1, code: 1, mark: 1, IVAPercent: 1, locations: 1 
                } 
            }
        ];

        const productsWithLocations = await Product.aggregate(pipeline);

        return res.status(200).json({ products: productsWithLocations });

    } catch (error: any) {
        console.error(`Error en getProductsWithLocations: ${error.message}`);
        return res.status(500).json({ message: "Error interno del servidor al buscar productos con ubicaciones." });
    }
}

export async function productsFeatured(req: Request, res: Response): Promise<Response> {
    try {
        // Parámetros de paginación
        const pageNumber = parseInt(req.body.page as string, 10) || 1;
        const pageSize = parseInt(req.body.quantity as string, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const limit = Math.max(0, pageSize);

        logger.info(`productsFeatured request (Products ONLY): page: ${pageNumber}, quantity: ${pageSize}`);

        if (pageNumber < 1 || pageSize < 1) {
            logger.warn(`Invalid pagination parameters received: page=${pageNumber}, quantity=${pageSize}`);
            return res.status(400).json({ message: "Los parámetros 'page' y 'quantity' deben ser números positivos." });
        }

        const aggregationPipeline: PipelineStage[] = [
            // 1. FILTRAR PRODUCTOS DESTACADOS y ACTIVOS
            {
                $match: {
                    featured: true,
                    state: 'ACTIVE',
                    deleted: false
                }
            },
            // 2. Proyección y Limpieza (Reformatear el producto)
            {
                $project: {
                    _id: '$_id',
                    name: '$name',
                    mark: '$mark',
                    featured: '$featured',
                    state: '$state',
                    image: '$image',
                    description: '$description',
                    code: '$code',
                    categories: '$categories',
                    IVAPercent: '$IVAPercent',
                    content: '$content',
                    linkPageProvider: '$linkPageProvider',
                    wheigth: '$wheigth',
                    // Importante: El campo 'locations' NO se proyecta, ya que no se busca.
                    // Asegúrate de incluir cualquier otro campo necesario del Producto.
                }
            },
            // 3. Ordenar los resultados
            {
                $sort: { name: 1 }
            },
            // 4. Usar $facet para paginación y conteo total
            {
                $facet: {
                    products: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    total: [
                        { $count: 'total' }
                    ]
                }
            }
        ];

        // Usamos el modelo Product para la agregación
        const result = await Product.aggregate(aggregationPipeline).exec();

        const paginatedProducts = result[0]?.products || [];
        const totalFeaturedProducts = result[0]?.total[0]?.total || 0;
        const totalPages = Math.ceil(totalFeaturedProducts / pageSize);

        logger.info(`Found ${totalFeaturedProducts} unique featured products (no stock check). Returning page ${pageNumber} with ${paginatedProducts.length} products.`);

        return res.status(200).json({
            total: totalFeaturedProducts,
            totalPages: totalPages,
            page: pageNumber,
            quantity: pageSize,
            products: paginatedProducts
        });

    } catch (error: any) {
        logger.error(`Error fetching featured products (Products ONLY): ${error.message}`, error);
        return res.status(500).json({ message: 'Error interno del servidor al obtener productos destacados.' });
    }
}

export async function productsAll(req: Request, res: Response): Promise<Response> {
    try {
        // Asegúrate de que req.params.location siempre sea una cadena válida
        const locationParam = req.params.location;

        // Validar que locationParam exista si es un requisito
        if (!locationParam) {
            logger.warn("El parámetro 'location' es requerido para la consulta de todos los productos.");
            return res.status(400).json({ message: "El parámetro 'location' es requerido para esta consulta." });
        }

        logger.info(`Fetching all products for location: ${locationParam}`);

        const aggregationPipeline: PipelineStage[] = [
            // 1. $match inicial (si hay filtros globales para todos los productos)
            // Si quieres todos los productos sin restricciones, este $match puede ser {}
            // O puedes agregar filtros aquí, ej. { state: "ACTIVE", deleted: false }
            { $match: {} }, // Actualmente, no hay filtros iniciales aquí, se incluyen todos los productos.

            // 2. $lookup para obtener las ubicaciones asociadas a cada producto
            {
                $lookup: {
                    from: 'locations', // Asegúrate de que 'locations' sea el nombre *real* de tu colección
                    localField: "_id",
                    foreignField: "idProduct",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$location", locationParam] }, // Filtra por la ubicación específica
                                        { $eq: ["$deleted", false] } // Opcional: solo ubicaciones no eliminadas
                                    ]
                                }
                            }
                        }
                    ],
                    as: "locations" // Nombre del campo donde se almacenarán las ubicaciones encontradas
                }
            },
            // 3. $match para filtrar productos que tengan al menos una ubicación que cumpla con los criterios
            // Esto reemplaza el .filter() en el código JavaScript
            {
                $match: {
                    "locations.0": { $exists: true } // Verifica que el array 'locations' no esté vacío
                }
            },
            // 4. Ordenar los resultados. Puedes ordenar por updatedAt y luego por name, o solo por name.
            { $sort: { updatedAt: -1, name: 1 } } // Ordena por fecha de actualización descendente, luego por nombre ascendente
        ];

        const listProducts = await Product.aggregate(aggregationPipeline).exec();

        logger.info(`Successfully retrieved ${listProducts.length} all products for location: ${locationParam}`);
        // Ya no es necesario el .filter() ni el .sort() manual en JavaScript
        // porque todo se maneja en el pipeline de agregación.

        return res.status(200).json(listProducts);

    } catch (error) {
        logger.error(`Error al obtener todos los productos para la ubicación ${req.params.location}: ${error}`); // Cambiado console.error a logger.error
        return res.status(500).json({ message: 'Error interno del servidor al obtener todos los productos.' });
    }
}

export async function productsById(req: Request, res: Response): Promise<Response> {
    try {
        // Validate and convert the ID from request parameters
        const productIdParam = req.params.id as string;

        if (!productIdParam || !ObjectId.isValid(productIdParam)) {
            logger.warn(`Invalid product ID format received: ${productIdParam}`);
            return res.status(400).json({ message: "Invalid product ID provided." });
        }

        const objectId = new ObjectId(productIdParam);
        logger.info(`Fetching product by ID: ${productIdParam}`);

        const aggregationPipeline: PipelineStage[] = [
            {
                $match: {
                    // Match by _id and ensure the product is not deleted
                    _id: objectId,
                    deleted: false
                }
            },
            {
                $lookup: {
                    from: 'locations', // Ensure 'locations' is the actual name of your collection
                    localField: "_id",
                    foreignField: "idProduct",
                    // No need for a pipeline here unless you want to filter locations further
                    // e.g., only active locations, or locations with specific attributes.
                    // For simply bringing all locations associated with the product, this is sufficient.
                    as: "locations"
                }
            },
            // You might want to sort the locations array within the product here,
            // or sort the main product results (though for a single product, sort is less impactful).
            // Example: To sort the 'locations' array by a field within locations:
            // {
            //     $addFields: {
            //         locations: {
            //             $sortArray: {
            //                 input: "$locations",
            //                 sortBy: { name: 1 } // Sort locations by their 'name' field, for example
            //             }
            //         }
            //     }
            // },
            // If you still want to sort the single product by updatedAt, it's mostly symbolic here
            { $sort: { updatedAt: -1 } }
        ];

        const result = await Product.aggregate(aggregationPipeline).exec();

        // Check if any product was found
        if (result.length === 0) {
            logger.warn(`Product with ID ${productIdParam} not found or is deleted.`);
            return res.status(404).json({ message: `Product with ID ${productIdParam} not found or is deleted.` });
        }

        // Since we're searching by a unique _id, we expect at most one result
        logger.info(`Product found for ID ${productIdParam}`);
        return res.status(200).json(result[0]);

    } catch (error) {
        // Catch specific ObjectId casting errors if new ObjectId(id) fails
        if (error instanceof Error && error.message.includes('Argument passed in must be a string of 12 bytes or a string of 24 hex characters')) {
            logger.error(`Invalid product ID format error: ${error.message}`);
            return res.status(400).json({ message: "Invalid product ID format." });
        }
        logger.error(`Error fetching product by ID ${req.params.id}: ${error}`); // Cambiado console.error a logger.error
        return res.status(500).json({ message: "Internal server error fetching product by ID." });
    }
}

export async function deleteProduct(req: Request, res: Response): Promise<Response> {
    // Assuming req.user is populated by an authentication middleware
    const user: any = req.user;

    // 1. Authorization Check
    if (!user || user.role !== "Admin") {
        logger.warn(`Unauthorized attempt to change product deleted status by user: ${user ? user.email : 'unknown'}`);
        return res.status(403).json({ message: "Usuario no autorizado para realizar esta acción." }); // 403 Forbidden
    }

    try {
        const productId = req.body.id as string;
        const newDeletedStatus = req.body.deleted as boolean; // Expecting true/false for new deleted status

        logger.info(`Request to change product deleted status for ID: ${productId} to ${newDeletedStatus}`);

        // 2. Validate Product ID
        if (!productId || !ObjectId.isValid(productId)) {
            logger.warn(`Invalid product ID provided for deleteProduct: ${productId}`);
            return res.status(400).json({ message: "ID de producto inválido o no proporcionado." });
        }

        // 3. Find the product first to get its name for the response and ensure it exists
        const productToUpdate = await Product.findById(productId);

        if (!productToUpdate) {
            logger.warn(`Product with ID ${productId} not found for deletion/restoration.`);
            return res.status(404).json({ message: `Producto con ID ${productId} no encontrado.` });
        }

        // 4. Validate the 'deleted' status payload
        if (typeof newDeletedStatus === 'undefined' || typeof newDeletedStatus !== 'boolean') {
            logger.warn(`Invalid 'deleted' status payload for product ID ${productId}: ${newDeletedStatus}`);
            return res.status(400).json({ message: "El estado 'deleted' es requerido y debe ser un valor booleano (true/false)." });
        }

        // 5. Perform the update. Using .save() to trigger pre/post middlewares if any.
        // This is important if you have any pre('save') hooks that need to run
        // when the 'deleted' status changes (though typically not needed for 'deleted' itself).
        productToUpdate.deleted = newDeletedStatus;
        await productToUpdate.save();

        const action = newDeletedStatus ? "eliminado (lógicamente)" : "restaurado";
        logger.info(`Product "${productToUpdate.name}" (ID: ${productToUpdate._id}) has been ${action} successfully. New status: ${productToUpdate.deleted}`);
        return res.status(200).json({
            success: `Producto "${productToUpdate.name}" ha sido ${action} exitosamente.`,
            productId: productToUpdate._id,
            deletedStatus: productToUpdate.deleted
        });

    } catch (error) {
        // Catch specific ObjectId casting errors if new ObjectId(id) fails
        if (error instanceof Error && error.message.includes('Argument passed in must be a string of 12 bytes or a string of 24 hex characters')) {
            logger.error(`Invalid product ID format error in deleteProduct: ${error.message}`);
            return res.status(400).json({ message: "Formato de ID de producto inválido." });
        }
        logger.error(`Error updating product status for ID ${req.body.id}: ${error}`); // Cambiado console.error a logger.error
        return res.status(500).json({ message: "Error interno del servidor al actualizar el producto." });
    }
}

export async function product(req: Request, res: Response): Promise<Response> {
    const productId = req.params.id as string;

    try {
        // 1. Validar el ID del producto
        if (!productId || !ObjectId.isValid(productId)) {
            logger.warn(`Intento de buscar producto con ID inválido: ${productId}`);
            return res.status(400).json({ message: "ID de producto inválido proporcionado." });
        }

        logger.info(`Buscando producto por ID: ${productId}`);

        // 2. Buscar el producto por su ID
        const RESULT: any = await Product.findById(productId); // Usar findById es más directo para un solo documento por _id

        // 3. Verificar si se encontró el producto
        if (!RESULT) {
            logger.info(`Producto con ID ${productId} no encontrado.`);
            return res.status(404).json({ message: `Producto con ID ${productId} no encontrado.` });
        }

        logger.info(`Producto encontrado exitosamente: ${RESULT.name} (ID: ${productId})`);
        // 4. Retornar el producto. Si `ascendentObjCompare("name")` se usaba para ordenar
        // múltiples resultados, para un solo resultado no tiene efecto,
        // pero se mantiene si la lógica original lo requería por alguna razón de consistencia de tipo.
        return res.status(200).json(RESULT); // No es necesario ordenar un solo objeto

    } catch (error) {
        // Capturar errores generales del servidor o de la base de datos
        logger.error(`Error al buscar producto por ID ${productId}: ${error}`);
        return res.status(500).json({ message: "Error interno del servidor al obtener el producto." });
    }
}

export async function productsByCategory(req: Request, res: Response): Promise<Response> {
    try {
        const categoryParam = req.body.category as string;

        logger.info(`Received request for products by category: ${categoryParam}`);

        // 1. Input Validation
        if (!categoryParam || typeof categoryParam !== 'string' || categoryParam.trim() === '') {
            logger.warn(`Invalid or missing 'category' parameter: ${categoryParam}`);
            return res.status(400).json({ message: "El parámetro 'category' es requerido y debe ser una cadena válida." });
        }

        const aggregationPipeline: PipelineStage[] = [
            {
                $match: {
                    state: "ACTIVE",
                    deleted: false,
                    categories: categoryParam
                }
            },
            { $sort: { updatedAt: -1, name: 1 } }
        ];

        const listProducts = await Product.find({
            state: "ACTIVE",
            deleted: false,
            categories: categoryParam
        })
            .sort({ updatedAt: -1, name: 1 })
            .exec();

        logger.info(`Successfully retrieved ${listProducts.length} products for category: ${categoryParam}`);

        return res.status(200).json(listProducts);

    } catch (error: any) {
        logger.error(`Error fetching products by category '${req.body.category}': ${error.message}`);
        return res.status(500).json({ message: 'Error interno del servidor al obtener productos por categoría.' });
    }
}

export async function productsByCategories(req: Request, res: Response): Promise<Response> {
    try {
        const categoriesParam = req.body.categories;

        logger.info(`Received request for products by multiple categories: ${JSON.stringify(categoriesParam)}`);

        if (!categoriesParam || !Array.isArray(categoriesParam) || categoriesParam.length === 0) {
            logger.warn("Missing or invalid 'categories' parameter: expected a non-empty array of strings.");
            return res.status(400).json({ message: "El parámetro 'categories' es requerido y debe ser un array no vacío de cadenas." });
        }
        const validCategories = categoriesParam.map((cat: any) => String(cat).trim()).filter((cat: string) => cat.length > 0);

        if (validCategories.length === 0) {
            logger.warn("The 'categories' array contains only invalid or empty string values after processing.");
            return res.status(400).json({ message: "El array 'categories' contiene solo valores inválidos." });
        }

        const aggregationPipeline: PipelineStage[] = [
            {
                $match: {
                    state: "ACTIVE",
                    deleted: false,
                    categories: { $in: validCategories }
                }
            },
            { $sort: { updatedAt: -1, name: 1 } }
        ];

        const listProducts = await Product.find({
            state: "ACTIVE",
            deleted: false,
            categories: { $in: validCategories }
        })
            .sort({ updatedAt: -1, name: 1 })
            .exec();

        logger.info(`Successfully retrieved ${listProducts.length} products for categories: ${JSON.stringify(validCategories)}`);

        return res.status(200).json(listProducts);

    } catch (error: any) {
        logger.error(`Error fetching products by categories '${JSON.stringify(req.body.categories)}': ${error.message}`);
        return res.status(500).json({ message: 'Error interno del servidor al obtener productos por categorías.' });
    }
}

export async function productsByName(req: Request, res: Response): Promise<Response> {
    try {
        const nameQuery = req.params.name as string;

        logger.info(`Received productsByName request for name: '${nameQuery}' (No Location Filter)`);

        if (!isValidString(nameQuery)) {
            logger.warn(`Invalid 'name' parameter received: '${nameQuery}'`);
            return res.status(400).json({ message: "El parámetro 'name' para la búsqueda es requerido y debe ser una cadena válida." });
        }

        const processedQuery = processSearchQuery(singularizarWord(nameQuery));
        const nameQueryRegex = new RegExp(nameQuery, 'i');
        const initialProductMatchConditions: any[] = [];

        initialProductMatchConditions.push(
            { name: { $regex: nameQueryRegex } },
            { code: { $regex: nameQueryRegex } },
            { mark: { $regex: nameQueryRegex } }
        );

        if (processedQuery.exactTerms.length > 0) {
            initialProductMatchConditions.push({
                $and: processedQuery.exactTerms.map(term => ({
                    exactSearchTerms: { $elemMatch: { $regex: new RegExp(term, 'i') } }
                }))
            });
        }

        if (processedQuery.keywords.length > 0) {
            initialProductMatchConditions.push({
                $and: processedQuery.keywords.map(keyword => ({
                    searchKeywords: { $elemMatch: { $regex: new RegExp(keyword, 'i') } }
                }))
            });
        }

        if (initialProductMatchConditions.length === 0) {
            logger.info(`No valid search terms generated for query: '${nameQuery}'`);
            return res.status(404).json({ message: "No se encontraron términos de búsqueda válidos para 'name'." });
        }

        const aggregationPipeline: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        { state: 'ACTIVE' },
                        { deleted: false },
                        { $or: initialProductMatchConditions }
                    ]
                },
            },

            {
                $addFields: {
                    score: {
                        $sum: [
                            // ... (Lógica de scoring - SE MANTIENE) ...
                            { $cond: [{ $regexMatch: { input: { $toString: "$name" }, regex: new RegExp(nameQuery, 'i') } }, 20, 0] },
                            { $cond: [{ $regexMatch: { input: { $toString: "$code" }, regex: new RegExp(nameQuery, 'i') } }, 18, 0] },
                            { $cond: [{ $regexMatch: { input: { $toString: "$mark" }, regex: new RegExp(nameQuery, 'i') } }, 15, 0] },
                            { $cond: [{ $gt: [{ $size: { $filter: { input: { $ifNull: ["$searchKeywords", []] }, as: "kw", cond: { $regexMatch: { input: "$$kw", regex: nameQueryRegex } } } } }, 0] }, 8, 0] },
                            { $cond: [{ $gt: [{ $size: { $filter: { input: { $ifNull: ["$stemmedKeywords", []] }, as: "sk", cond: { $regexMatch: { input: "$$sk", regex: nameQueryRegex } } } } }, 0] }, 5, 0] },
                            { $cond: [{ $regexMatch: { input: { $toString: "$description" }, regex: new RegExp(nameQuery, 'i') } }, 2, 0] },
                            { $cond: ["$featured", 5, 0] }
                        ]
                    }
                }
            },
            { $sort: { score: -1, name: 1 } }
        ];

        const products = await Product.aggregate(aggregationPipeline).exec();

        if (products.length === 0) {
            logger.info(`No products found for name query: '${nameQuery}'`);
            return res.status(404).json([]);
        }

        logger.info(`Found ${products.length} products for name query: '${nameQuery}'`);
        return res.status(200).json(products);
    } catch (error: any) {
        logger.error(`Error in productsByName for query '${req.params.name}': ${error.message}`);
        return res.status(500).json({ message: 'Error interno del servidor al buscar productos por nombre.' });
    }
}

export async function productsByListIds(req: Request, res: Response) {
    let RESULT = [];

    try {
        if (!req.body.listIds || typeof req.body.listIds !== 'object' || Object.keys(req.body.listIds).length === 0) {
            logger.warn("Invalid or empty 'listIds' in productsByListIds request body.");
            return res.status(400).json({ message: "El cuerpo de la solicitud debe contener un objeto 'listIds' no vacío." });
        }
        let arrayKeys = Object.keys(req.body.listIds);
        const listaIdsObjectId: ObjectId[] = [];
        for (const id of arrayKeys) {
            if (ObjectId.isValid(id)) {
                listaIdsObjectId.push(new ObjectId(id));
            } else {
                logger.warn(`Skipping invalid ObjectId in listIds: ${id}`);
            }
        }
        if (listaIdsObjectId.length === 0) {
            logger.warn("No valid ObjectIds found in the 'listIds' array after parsing.");
            return res.status(400).json({ message: "No se encontraron IDs de producto válidos en la lista proporcionada." });
        }
        logger.info(`Fetching products by list of IDs. IDs: ${listaIdsObjectId.join(', ')}`);

        RESULT = await Product.aggregate([
            {
                $match: {
                    $and: [
                        { deleted: false },
                        { _id: { $in: listaIdsObjectId } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'locations',
                    localField: "_id",
                    foreignField: "idProduct",
                    as: "locations",

                    pipeline: [
                        {
                            $lookup: {
                                from: 'stores',
                                localField: 'idStore',
                                foreignField: '_id',
                                as: 'storeInfo'
                            }
                        },
                        { $unwind: '$storeInfo' },
                        {
                            $project: {
                                _id: 1,
                                location: 1,
                                idStore: 1,
                                price: 1,
                                store_price: 1,
                                stock: 1,
                                unitDiscount: 1,
                                discountPer: 1,
                                deleted: 1,
                                idProduct: 1,
                                store_name: '$storeInfo.name'
                            }
                        }
                    ]
                }
            },
            { $sort: { updatedAt: -1 } }
        ]);

        RESULT = RESULT.map((product: any) => {
            product.quantity = req.body.listIds[product._id.toString()];
            return product;
        });

        logger.info(`Successfully retrieved ${RESULT.length} products by list of IDs.`);
        return res.status(200).json(RESULT);

    } catch (error: any) {
        logger.error(`Error in productsByListIds: ${error.message}`);
        if (error.message.includes('Argument passed in must be a string of 12 bytes or a string of 24 hex characters')) {
            return res.status(400).json({ message: "Uno o más IDs de producto en la lista tienen un formato inválido." });
        }
        return res.status(500).json({ message: "Error interno del servidor al obtener productos por lista de IDs." });
    }
}

export async function productsByFilter(req: Request, res: Response): Promise<Response> {
    try {
        const {
            code,
            mark,
            categories,
            featured,
            IVAPercent,
            searchTerm
        } = req.body;

        logger.info(`productsByFilter request received with filters: ${JSON.stringify(req.body)}`);

        const productMatchConditions: any[] = [
            { deleted: false },
            { state: 'ACTIVE' },
        ];

        if (isValidString(code)) {
            productMatchConditions.push({ code: { $regex: code, $options: 'i' } });
        }
        if (typeof featured === 'boolean') {
            productMatchConditions.push({ featured: featured });
        }
        if (IVAPercent != null) {
            const parsedIva = parseFloat(IVAPercent);
            if (!isNaN(parsedIva)) {
                productMatchConditions.push({ IVAPercent: parsedIva });
            }
        }
        if (Array.isArray(categories) && categories.length > 0) {
            const validCategories = categories.map(cat => String(cat).trim()).filter(cat => cat.length > 0);
            if (validCategories.length > 0) {
                productMatchConditions.push({ categories: { $in: validCategories } });
            }
        }

        let textSearchQuery = searchTerm || req.body.name;
        let processedQuery: ReturnType<typeof processSearchQuery> | undefined;

        if (isValidString(textSearchQuery)) {
            processedQuery = processSearchQuery(textSearchQuery);
            const textSearchConditions: any[] = [];

            textSearchConditions.push({ name: { $regex: new RegExp(textSearchQuery, 'i') } });
            textSearchConditions.push({ code: { $regex: new RegExp(textSearchQuery, 'i') } });

            if (processedQuery.exactTerms.length > 0) {
                textSearchConditions.push({ exactSearchTerms: { $all: processedQuery.exactTerms } });
            }
            if (processedQuery.keywords.length > 0) {
                textSearchConditions.push({ searchKeywords: { $in: processedQuery.keywords } });
            }

            if (textSearchConditions.length > 0) {
                productMatchConditions.push({ $or: textSearchConditions });
            }
        }

        if (isValidString(mark)) {
            const normalizedMark = unidecode(mark).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedMark.length > 0) {
                productMatchConditions.push({ mark: { $regex: normalizedMark, $options: 'i' } });
            }
        }

        const pipeline: PipelineStage[] = [
            { $match: { $and: productMatchConditions } },
        ];

        if (isValidString(textSearchQuery) && processedQuery) {
            pipeline.push({
                $addFields: {
                    score: {
                        $sum: [
                            // ... (Lógica de scoring - SE MANTIENE) ...
                            { $cond: [{ $regexMatch: { input: "$name", regex: new RegExp(textSearchQuery, 'i') } }, 20, 0] },
                            { $cond: [{ $regexMatch: { input: "$code", regex: new RegExp(textSearchQuery, 'i') } }, 18, 0] },
                            { $cond: [{ $regexMatch: { input: "$mark", regex: new RegExp(textSearchQuery, 'i') } }, 15, 0] },
                            { $cond: [{ $allElementsTrue: [{ $map: { input: processedQuery.exactTerms, as: "term", in: { $in: ["$$term", "$exactSearchTerms"] } } }] }, 12, 0] },
                            { $cond: [{ $gt: [{ $size: { $filter: { input: "$searchKeywords", as: "kw", cond: { $in: ["$$kw", processedQuery.keywords] } } } }, 0] }, 8, 0] },
                            { $cond: [{ $gt: [{ $size: { $filter: { input: "$stemmedKeywords", as: "sk", cond: { $in: ["$$sk", processedQuery.stemmed] } } } }, 0] }, 5, 0] },
                            { $cond: [{ $regexMatch: { input: "$description", regex: new RegExp(textSearchQuery, 'i') } }, 2, 0] },
                            { $cond: ["$featured", 5, 0] }
                        ]
                    }
                }
            });
        }

        pipeline.push({ $sort: isValidString(textSearchQuery) ? { score: -1, name: 1 } : { name: 1 } });

        let resultProducts = await Product.aggregate(pipeline).exec();

        logger.info(`Found ${resultProducts.length} products matching the filter criteria.`);

        return res.status(200).json(resultProducts);

    } catch (err: any) {
        logger.error(`Error in productsByFilter (General Search): ${err}`);
        return res.status(500).json({ message: 'Error interno del servidor al procesar la solicitud de productos.' });
    }
}

export async function getImage(req: Request, res: Response): Promise<Response> {
    const imageName = req.params.img;
    const imagePath = path.join(config.PATH.URLIMAGESPRODUCT, imageName);
    const defaultImagePath = path.join(config.PATH.URLIMAGESPRODUCT, 'default.jpg');

    logger.info(`Solicitud para obtener imagen: ${imageName}`);

    try {
        // Verificar si la imagen existe en la ruta especificada
        await fs.promises.access(imagePath, fs.constants.F_OK);
        // Si no hay error, la imagen existe
        logger.info(`Imagen encontrada en: ${imagePath}`);
        res.status(200).sendFile(path.resolve(imagePath));
        return res;
    } catch (error: any) {
        // Si hay un error (ej. archivo no encontrado), usa la imagen por defecto
        if (error.code === 'ENOENT') {
            logger.warn(`Imagen no encontrada: ${imageName}. Sirviendo imagen por defecto.`);
        } else {
            logger.error(`Error inesperado al acceder a la imagen ${imageName}: ${error.message}`);
        }

        try {
            // Verificar si la imagen por defecto existe
            await fs.promises.access(defaultImagePath, fs.constants.F_OK);
            logger.info(`Sirviendo imagen por defecto desde: ${defaultImagePath}`);
            res.status(200).sendFile(path.resolve(defaultImagePath));
            return res as Response;
        } catch (defaultImageError: any) {
            // Si incluso la imagen por defecto falla, loguear un error crítico
            logger.error(`ERROR CRÍTICO: La imagen por defecto no se encuentra o no es accesible: ${defaultImageError.message}`);
            return res.status(500).json({ message: "No se pudo cargar la imagen solicitada ni la imagen por defecto." });
        }
    }
}

export async function pdfProductsFiltered(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    logger.info(`Solicitud para generar PDF de productos filtrados para ID: ${id}`);

    try {
        if (!id) {
            logger.warn(`ID de parámetro no proporcionado para pdfProductsFiltered.`);
            return res.status(400).send('ID de parámetro requerido para generar el PDF.');
        }

        const fontAncizar = {
            Roboto: {
                normal: `${pathFolders.files}/fonts/Roboto/Roboto-Light.ttf`,
                bold: `${pathFolders.files}/fonts/Roboto/Roboto-Bold.ttf`,
                italics: `${pathFolders.files}/fonts/Roboto/Roboto-LightItalic.ttf`,
                bolditalics: `${pathFolders.files}/fonts/Roboto/Roboto-BoldItalic.ttf`,
            },
        };

        // Verificación de existencia de fuentes para depuración (opcional, pero recomendado)
        for (const fontStyle in fontAncizar.Roboto) {
            const fontPath = (fontAncizar.Roboto as any)[fontStyle];
            if (!fs.existsSync(fontPath)) {
                logger.error(`Fuente no encontrada: ${fontPath}. Asegúrate de que las rutas de las fuentes sean correctas.`);
                // Podrías lanzar un error o usar una fuente de respaldo si tu aplicación puede manejarlo.
                // Para este caso, continuaremos, pero el PDF podría no verse como se espera.
            }
        }

        const printer = new PdfPrinter(fontAncizar);

        // Asegúrate de que createBodyPdf maneje sus propios errores o que se capturen aquí
        const dd = await createBodyPdf(id);
        if (!dd) {
            logger.error(`createBodyPdf no devolvió un documento válido para ID: ${id}`);
            return res.status(500).send('Error interno: No se pudo generar el contenido del PDF.');
        }

        const REQUESTFOLDER = path.join(pathFolders.temp as string, 'pdfs');

        // Crea la carpeta si no existe
        if (!fs.existsSync(REQUESTFOLDER)) {
            logger.info(`Creando directorio para PDFs temporales: ${REQUESTFOLDER}`);
            fs.mkdirSync(REQUESTFOLDER, { recursive: true }); // recursive: true para crear carpetas anidadas si no existen
        }

        const pdfPath = path.join(REQUESTFOLDER, `${id}.pdf`);
        const pdfDoc = printer.createPdfKitDocument(dd);
        const tempWriteStream = fs.createWriteStream(pdfPath);

        pdfDoc.pipe(tempWriteStream);
        pdfDoc.end();

        tempWriteStream.on('finish', () => {
            logger.info(`PDF generado exitosamente y guardado en: ${pdfPath}. Enviando archivo.`);
            res.status(200).sendFile(pdfPath, (err) => {
                if (err) {
                    logger.error(`Error al enviar el archivo PDF ${pdfPath}: ${err.message}`);
                    // Puedes decidir enviar un 500 aquí si el envío falla
                    // res.status(500).send('Error al enviar el archivo PDF.');
                } else {
                    logger.info(`Archivo PDF ${pdfPath} enviado correctamente.`);
                }
                // Opcional: Eliminar el archivo después de enviarlo para limpiar temporales
                fs.unlink(pdfPath, (unlinkErr) => {
                    if (unlinkErr) {
                        logger.error(`Error al eliminar archivo PDF temporal ${pdfPath}: ${unlinkErr.message}`);
                    } else {
                        logger.info(`Archivo PDF temporal ${pdfPath} eliminado.`);
                    }
                });
            });
        });

        tempWriteStream.on('error', (streamError) => {
            logger.error(`Error en el stream de escritura del PDF para ID ${id}: ${streamError.message}`);
            // Asegúrate de que solo se envíe una respuesta al cliente
            if (!res.headersSent) {
                return res.status(500).send('Error al escribir el PDF en el servidor.');
            }
        });

        // Ensure a Response is always returned after the async operations
        return res;
    } catch (error: any) {
        logger.error(`Error inesperado en pdfProductsFiltered para ID ${req.params.id}: ${error.message}`, error);
        // Asegúrate de que solo se envíe una respuesta al cliente
        if (!res.headersSent) {
            return res.status(500).send('Error interno del servidor al generar el PDF.');
        }
        // If headers were already sent, still return res to satisfy the return type
        return res;
    }
}

async function createBodyPdf(id: string): Promise<any> {
    try {
        const productos = [
            {
                "_id": "6654b4b7d41d436188bd13c8",
                "code": "000589",
                "name": "ADHESIVO CEMENTOSO MAPEI KERABOND PLUS",
                "slug": "ADHESIVO-CEMENTOSO-MAPEI-KERABOND-PLUS",
                "mark": "MAPEI",
                "description": "ADHESIVO PARA BALDOSAS. Adhesivo cementoso de alto rendimiento, con tiempo abierto prolongado para baldosas de cerámica y piedra. Colocación en interior y exterior de: baldosas de cerámica (absorbentes, no absorbentes), gres porcelánico, gres cerámico, material pétreo y mosaicos de todo tipo en pisos, paredes y techos.",
                "content": {
                    "Aspecto:": " polvo",
                    "Colores:": " gris y blanco.",
                    "Duración de la mezcla: ": "más de 8 horas.",
                    "Densidad de la mezcla:": "1.45 kg/litro.",
                    "Tiempo abierto:": " ≥ 30 minutos.",
                    "Tiempo de espera antes de emboquillar:": " en paredes, 4 - 8 horas; en pisos, 24 horas.",
                    "EMICODE:": " EC1 R Plus - emisión muy baja.",
                    "Configurado para tráfico peatonal ligero: ": "aproximadamente 24 horas.",
                    "Listo para usar: ": " aproximadamente 14 días.",
                    "Aplicación: ": " llana dentada N°4, 5 o 6. ",
                    "Almacenamiento: ": " 12 meses en su empaque original cerrado.",
                    "Consumo:": " 2 - 5 kg / m² por mm de espesor.",
                    "Presentación: ": " bolsa de 25 kg."
                },
                "wheigth": 25,
                "categories": [
                    "HOGAR",
                    "PISOS Y PAREDES ",
                    "Selladores elásticos y adhesivos"
                ],
                "image": "d2FzaC1wcmltZXItYmFzZS1zb2x2ZW50ZS5wbmc=",
                "state": "ACTIVE",
                "featured": true,
                "deleted": false,
                "createdAt": "2024-05-27T11:28:39.632481",
                "updatedAt": "2024-08-23T15:56:51.087Z",
                "mshigh": 50,
                "mslong": 30,
                "msthickness": 12,
                "linkPageProvider": "https://www.mapei.com/co/es-co/productos/lista-de-productos/detalles-del-producto/kerabond-plus",
                "IVAPercent": 19,
                "locations": [
                    {
                        "_id": "6654b4b7d41d436188bd13c9",
                        "location": "Manizales - Caldas",
                        "cost": 30221,
                        "price": 37776,
                        "stock": 100,
                        "discountPer": 0,
                        "unitDiscount": 5,
                        "deliveryService": true,
                        "onStore": true,
                        "numSales": 0,
                        "numScore": 0,
                        "idProduct": "6654b4b7d41d436188bd13c8",
                        "deleted": false,
                        "createdAt": "2023-06-09T15:08:38.919Z",
                        "updatedAt": "2023-06-08T23:34:43.507Z"
                    }
                ]
            }
            // Add more product objects as needed
        ];

        // Define the document definition
        const dd = {
            pageSize: 'LETTER',
            pageMargins: [40, 60, 40, 60],
            content: [
                {
                    text: 'Índice de Productos',
                    style: 'header',
                    alignment: 'center'
                },
                {
                    ul: productos.map((producto, index) => ({
                        text: `${index + 1}. ${producto.name}`,
                        linkToPage: index + 2
                    }))
                },
                ...productos.map((producto, index) => {
                    return [
                        { text: '', pageBreak: 'before' },
                        {
                            text: producto.name,
                            style: 'subheader',
                            alignment: 'center'
                        },
                        {
                            image: path.join(pathFolders.product as string, producto.image), //path.join(pathFolders.product as string, Buffer.from(producto.image, 'base64').toString('ascii')),
                            width: 150,
                            alignment: 'center',
                            margin: [0, 10, 0, 10]
                        },
                        {
                            text: `Marca: ${producto.mark}`,
                            style: 'subheader',
                            alignment: 'left'
                        },
                        {
                            text: `Precio: $${producto.locations[0].price}`,
                            style: 'subheader',
                            color: 'blue',
                            alignment: 'left'
                        },
                        {
                            text: producto.description,
                            style: 'text'
                        },
                        {
                            text: 'Datos adicionales:',
                            style: 'subheader'
                        },
                        {
                            table: {
                                headerRows: 1,
                                widths: ['50%', '50%'],
                                body: [
                                    [
                                        { text: 'Característica', style: 'tableHeader' },
                                        { text: 'Detalle', style: 'tableHeader' }
                                    ],
                                    ...Object.entries(producto.content).map(([key, value]) => [
                                        { text: key, bold: true, color: 'green' },
                                        { text: value, color: 'black' }
                                    ])
                                ]
                            },
                            layout: 'lightHorizontalLines'
                        }
                    ];
                })
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true
                },
                subheader: {
                    fontSize: 14,
                    bold: true
                },
                text: {
                    fontSize: 12
                },
                tableHeader: {
                    bold: true,
                    fontSize: 13,
                    color: 'black'
                }
            },
            defaultStyle: {
                fontSize: 10
            }
        };
        return dd;
    } catch (error) {
        console.error(error);
        return {
            content: [{ text: 'No se encontraron los datos del proyecto' }],
        };
    }
}