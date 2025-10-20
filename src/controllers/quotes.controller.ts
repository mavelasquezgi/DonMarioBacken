import { Request, Response } from 'express'
import Quote from '../models/quote'
import Location from '../models/locations'
import User from '../models/user'
import config from "../config/config";
import { getConsecutive, typeObject } from '../helpers/helpers';
import { verifyToken } from '../helpers/jwt_helpers';
import { createPdfFromStrHtml } from '../helpers/externalAPIs';
import fs from 'fs';
import { functSendAlertEmail } from '../helpers/nodemailer.helpers';
import { format } from 'date-fns';
import mongoose, { PipelineStage, Types } from 'mongoose';
import logger from '../helpers/winstonLogger';

// Función de utilidad para manejar la lógica de cálculo del total (limpieza)
function calculateTotal(listProducts: any[]): number {
    let total = 0;
    listProducts.forEach((element: any) => {
        const location = element.locations ? element.locations[0] : null;

        if (!location || typeof location.price !== 'number' || typeof element.quantity !== 'number' || element.quantity <= 0) {
            logger.warn(`Skipping product in total calculation due to invalid data: ${element.code || 'Unknown'}`);
            return;
        }

        let priceToUse = location.price;

        // Aplicar descuento
        if (location.unitDiscount && element.quantity >= location.unitDiscount &&
            location.discountPer !== undefined && location.discountPer > 0) {

            const discountedPrice = priceToUse * (1 - (location.discountPer / 100));
            total += element.quantity * discountedPrice;
        } else {
            total += element.quantity * priceToUse;
        }
    });

    return parseFloat(total.toFixed(2));
}

// Función de utilidad para manejar la descripción de errores de Mongoose
function handleMongooseError(error: any, res: Response): Response {
    if (error.name === 'ValidationError') {
        const errors = Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
        }));
        logger.error(`Validation Error creating quote: ${JSON.stringify(errors)}`);
        return res.status(400).json({
            message: "Fallo de validación en los datos de la cotización.",
            details: errors
        });
    }

    if (error.code === 11000) { // Error de clave duplicada de MongoDB
        const field = Object.keys(error.keyValue)[0];
        logger.error(`Duplicate Key Error creating quote: Field ${field} is duplicated.`);
        return res.status(409).json({
            message: `El campo ${field} ya existe.`,
            details: `Valor duplicado: ${error.keyValue[field]}`
        });
    }

    logger.error(`Unhandled Database Error creating quote: ${error.message}`);
    return res.status(500).json({
        message: "Error interno del servidor al interactuar con la base de datos.",
        details: error.message
    });
}

// =========================================================================

export async function createQuote(req: Request, res: Response): Promise<Response> {
    logger.info(`Attempting to create a new quote.`);

    // 1. AUTENTICACIÓN
    if (!(req.headers?.tokenbyaccesss)) {
        return res.status(401).send({ message: 'No autorizado: Token de acceso requerido.' });
    }

    const validateToken: any = await verifyToken(req.headers?.tokenbyaccesss as string);
    if (!(validateToken && validateToken.username === "Amas" && validateToken.password === "QW1hc3MqQWRtaW4=")) {
        return res.status(403).send({ message: 'Acceso denegado: Credenciales de token inválidas.' });
    }

    try {
        // 2. PARSEO DE DATOS y VALIDACIÓN BÁSICA
        let listProductsParsed: any[];
        let contentParsed: any = {};

        // 2a. Parsear listProducts
        try {
            listProductsParsed = JSON.parse(req.body.listProducts);
        } catch (e) {
            return res.status(400).json({ message: "El formato de 'listProducts' es inválido (JSON no válido)." });
        }
        if (!Array.isArray(listProductsParsed) || listProductsParsed.length === 0) {
            return res.status(400).json({ message: "La lista de productos es requerida y debe ser un array no vacío." });
        }

        // 2b. Parsear content (si existe)
        if (req.body.content) {
            try {
                contentParsed = JSON.parse(req.body.content);
            } catch (e) {
                return res.status(400).json({ message: "El formato de 'content' es inválido (JSON no válido)." });
            }
        }

        // 3. DETERMINACIÓN DE ID DE USUARIO Y CÁLCULO DE TOTAL
        // idUser: ID del creador (vendedor/admin), puede ser null si no hay sesión.
        const idUser = req.user && req.user.id ? new Types.ObjectId(req.user.id) : null;

        // idClient: ID único del cliente, debe venir en req.body.idClient (como ObjectId)
        if (!req.body.idClient) {
            return res.status(400).json({ message: "El ID único del cliente ('idClient') es requerido." });
        }
        const idClient = new Types.ObjectId(req.body.idClient);


        const totalCalculated = calculateTotal(listProductsParsed);

        // 4. CREACIÓN DEL OBJETO DE LA COTIZACIÓN (Mapeo directo y minimalista)
        const NEWQUOTE: any = {
            // Campos automáticos y de configuración
            idQuote: await getConsecutive(typeObject.quote, config.COMPANY.NAME, config.COMPANY.ID, config.COMPANY.TYPE),
            company: config.COMPANY.NAME,
            idCompany: config.COMPANY.ID,
            addressCompany: config.COMPANY.ADDRESS,
            typeCompany: config.COMPANY.TYPE,
            phoneCompany: config.COMPANY.PHONE,
            dateOrder: format(new Date(), 'yyyy-MM-dd_HH:mm:ss'),
            deleted: false,

            // Campos de la solicitud (Mapeo directo gracias a la asunción de coincidencia de nombres)
            clientNames: req.body.clientNames,
            clientLastnames: req.body.clientLastnames,
            documentClient: req.body.documentClient,
            addressClient: req.body.addressClient,
            departmentClient: req.body.departmentClient,
            cityClient: req.body.cityClient,
            phoneClient: req.body.phoneClient,
            emailClient: req.body.emailClient,
            daysValid: req.body.daysValid || 3,
            sendemail: req.body.sendemail === true,
            sendwhatsapp: req.body.sendwhatsapp === true,
            type: req.body.type || "QUOTE",

            // Campos procesados
            idClient: idClient,
            listProducts: listProductsParsed,
            content: contentParsed,
            idUser: idUser,

            // Totales
            total: totalCalculated,
            due_amount: totalCalculated,
        }

        // 5. GUARDAR EN MONGOOSE (Mongoose validará todos los campos requeridos)
        const quote = new Quote(NEWQUOTE);
        await quote.save();
        logger.info(`Quote created successfully with ID: ${quote._id}`);

        // 6. ENVÍO DE ALERTAS
        const quoteLink = `${req.headers.origin}/orders/quote/${quote._id}`;
        const alertSubject = `Se creó su cotización ${quote.idQuote}`;

        if (NEWQUOTE.sendemail) {
            const recipientEmails = [NEWQUOTE.emailClient, config.COMPANY.EMAILALERTS].filter(Boolean);
            let sendResult = await functSendAlertEmail(recipientEmails, alertSubject, quoteLink);
            if (!sendResult) {
                logger.error(`Failed to send email alert for quote ${quote._id}`);
            } else {
                logger.info(`Email alert sent successfully for quote ${quote._id}`);
            }
        }

        return res.status(201).json({ success: quote.idQuote, quote });

    } catch (error: any) {
        // Manejar errores de Mongoose (Validación, Duplicado, etc.)
        if (error.name === 'ValidationError' || error.code === 11000) {
            return handleMongooseError(error, res);
        }

        // Manejar otros errores
        logger.error(`Error creating quote (Unhandled): ${error.message}`, error);
        return res.status(500).json({ message: "Error interno del servidor.", details: error.message });
    }
}

export async function editeQuote(req: Request, res: Response): Promise<Response> {
    logger.info(`Attempting to edit quote with ID: ${req.body.id}`);

    try {
        // Basic validation for ID
        if (!req.body.id || !mongoose.Types.ObjectId.isValid(req.body.id)) {
            logger.warn(`Invalid quote ID provided for editing: ${req.body.id}`);
            return res.status(400).json({ message: "ID de cotización inválido o no proporcionado." });
        }

        const listProductsParsed = JSON.parse(req.body.listProducts);
        const contentParsed = JSON.parse(req.body.content);

        if (!Array.isArray(listProductsParsed) || listProductsParsed.length === 0) {
            logger.warn(`Validation Error: 'listProducts' is empty or invalid during quote edit.`);
            return res.status(400).json({ message: "La lista de productos es requerida y debe ser un array no vacío." });
        }

        const NEWQUOTE: any = {
            idQuote: req.body.idQuote, // Assuming idQuote doesn't change on edit
            company: config.COMPANY.NAME,
            idCompany: config.COMPANY.ID,
            addressCompany: config.COMPANY.ADDRESS,
            typeCompany: config.COMPANY.TYPE,
            phoneCompany: config.COMPANY.PHONE,
            clientNames: req.body.names,
            clientLastnames: req.body.lastnames,
            idClient: req.body.document,
            addressClient: req.body.address,
            departmentClient: req.body.department,
            cityClient: req.body.city,
            phoneClient: req.body.phone,
            dateOrder: req.body.dateOrder, // DateOrder should ideally not change on edit
            listProducts: listProductsParsed,
            content: contentParsed,
            daysValid: 3,
            type: req.body.type,
            deleted: false
        }

        let total = 0;
        listProductsParsed.forEach((element: any) => {
            if (!element.locations || element.locations.length === 0 || !element.locations[0].price || typeof element.quantity !== 'number') {
                logger.warn(`Skipping product in total calculation during edit due to missing/invalid data: ${JSON.stringify(element)}`);
                return;
            }
            if (element.locations[0].unitDiscount && element.locations[0].unitDiscount < element.quantity) {
                total += element.quantity * element.locations[0].price;
            } else if (element.locations[0].discountPer !== undefined && typeof element.locations[0].discountPer === 'number') {
                total += element.quantity * (element.locations[0].price * (1 - (element.locations[0].discountPer / 100)));
            } else {
                total += element.quantity * element.locations[0].price;
            }
        });

        NEWQUOTE['total'] = parseFloat(total.toFixed(2));
        NEWQUOTE['due_amount'] = parseFloat(total.toFixed(2));

        const updatedQuote = await Quote.findByIdAndUpdate(req.body.id, NEWQUOTE, { new: true }); // {new: true} returns the updated document

        if (updatedQuote) {
            logger.info(`Quote edited successfully with ID: ${req.body.id}`);
            return res.status(200).json({ success: "Se editó la cotización de forma exitosa", quote: updatedQuote });
        } else {
            logger.warn(`Quote with ID ${req.body.id} not found for editing.`);
            return res.status(404).json({ message: "Cotización no encontrada para editar." });
        }
    } catch (error: any) {
        logger.error(`Error editing quote with ID ${req.body.id}: ${error.message}`, error);
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            return res.status(400).json({ message: "Error en el formato JSON de 'listProducts' o 'content'." });
        }
        return res.status(500).json({ message: "Error interno del servidor al editar la cotización." });
    }
}

export async function quoteToOrder(req: Request, res: Response): Promise<Response> {
    logger.info(`Attempting to convert quote to order for ID: ${req.body.id}`);

    try {
        if (!req.body.id || !mongoose.Types.ObjectId.isValid(req.body.id)) {
            logger.warn(`Invalid quote ID provided for conversion to order: ${req.body.id}`);
            return res.status(400).json({ message: "ID de cotización inválido o no proporcionado." });
        }

        const consecutiveOrder = await getConsecutive(typeObject.order, config.COMPANY.NAME, config.COMPANY.ID, config.COMPANY.TYPE);
        if (!consecutiveOrder) {
            logger.error(`Failed to get a new consecutive order number.`);
            return res.status(500).json({ message: "Error al generar el número de orden consecutivo." });
        }

        const quoteToUpdate = await Quote.findById(req.body.id);
        if (!quoteToUpdate) {
            logger.warn(`Quote with ID ${req.body.id} not found for conversion to order.`);
            return res.status(404).json({ message: "Cotización no encontrada para convertir a orden." });
        }

        const listProductsParsed = JSON.parse(req.body.listProducts);
        if (!Array.isArray(listProductsParsed)) {
            logger.warn(`Invalid 'listProducts' format during quote to order conversion for quote ${req.body.id}.`);
            return res.status(400).json({ message: "El formato de 'listProducts' es inválido." });
        }

        // Use bulkWrite for efficiency if many locations need updating
        const bulkOps = listProductsParsed.map((element: any) => {
            if (element.locations && element.locations.length > 0 && element.locations[0]._id && element.quantity) {
                if (!mongoose.Types.ObjectId.isValid(element.locations[0]._id)) {
                    logger.warn(`Invalid location ID found for product ${element._id} during stock update: ${element.locations[0]._id}`);
                    return null; // Skip this operation if location ID is invalid
                }
                logger.debug(`Updating stock for location ${element.locations[0]._id}: -${element.quantity} stock, +${element.quantity} sales.`);
                return {
                    updateOne: {
                        filter: { _id: new mongoose.Types.ObjectId(element.locations[0]._id) },
                        update: { $inc: { stock: -element.quantity, numSales: element.quantity } }
                    }
                };
            } else {
                logger.info(`No identifiable product or location to update stock for product: ${JSON.stringify(element)}`);
                return null;
            }
        });

        const filteredBulkOps = bulkOps.filter((op): op is NonNullable<typeof op> => op !== null);

        if (filteredBulkOps.length > 0) {
            try {
                const bulkResult = await Location.bulkWrite(filteredBulkOps);
                logger.info(`Bulk stock update successful for quote ${req.body.id}. Matched: ${bulkResult.matchedCount}, Modified: ${bulkResult.modifiedCount}`);
            } catch (bulkError: any) {
                logger.error(`Error during bulk stock update for quote ${req.body.id}: ${bulkError.message}`, bulkError);
                // Decide if you want to roll back the quote update or proceed.
                // For now, it proceeds, but this might need business logic review.
            }
        } else {
            logger.info(`No stock updates performed for quote ${req.body.id} as no valid products/locations were found.`);
        }

        const updatedQuote = await Quote.findByIdAndUpdate(req.body.id, {
            type: req.body.type,
            deleted: false,
            idOrder: consecutiveOrder,
        }, { new: true });

        if (updatedQuote) {
            logger.info(`Quote ${req.body.id} successfully converted to order ${consecutiveOrder}.`);
            return res.status(200).json(updatedQuote);
        } else {
            logger.error(`Quote ${req.body.id} was not updated after stock modifications. This indicates a potential issue.`);
            return res.status(500).json({ message: "Error al actualizar la cotización a orden." });
        }
    } catch (error: any) {
        logger.error(`Error converting quote to order for ID ${req.body.id}: ${error.message}`, error);
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            return res.status(400).json({ message: "Error en el formato JSON de 'listProducts'." });
        }
        return res.status(500).json({ message: "Error interno del servidor al convertir la cotización a orden." });
    }
}

export async function quotes(req: Request, res: Response): Promise<Response> {
    // Parámetros de paginación de la query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5; // El pageSize por defecto en Angular es 5
    const skip = (page - 1) * limit;

    const rawFilters = { ...req.query, ...req.body }; // Fusionar query y body para flexibilidad

    logger.info(`Fetching quotes with filters and pagination. Page: ${page}, Limit: ${limit}, Raw Filters: ${JSON.stringify(rawFilters)}`);

    let queryFilters: any = {};

    try {
        for (const key in rawFilters) {
            if (rawFilters.hasOwnProperty(key)) {
                const value = rawFilters[key];

                // Ignorar parámetros de paginación que no son filtros
                if (['page', 'limit'].includes(key)) {
                    continue;
                }

                // Ignorar valores nulos, indefinidos o cadenas vacías (ya manejado en Angular, pero buena práctica defensiva)
                if (value === null || value === undefined || value === '') {
                    continue;
                }

                // Manejar filtros por ID (MongoDB ObjectId)
                if (key === '_id' || key === 'idProduct' || key === 'idUser') { // Añadido idProduct, idUser
                    if (mongoose.Types.ObjectId.isValid(value)) {
                        queryFilters[key] = new mongoose.Types.ObjectId(value);
                    } else {
                        logger.warn(`Invalid ObjectId format for filter '${key}': ${value}`);
                        return res.status(400).json({ message: `Formato de ID inválido para el filtro '${key}'.` });
                    }
                }
                // Manejar el filtro 'type' (QUOTE o ORDER)
                else if (key === 'type') {
                    queryFilters.type = value.toString().toUpperCase(); // Asegurar que sea mayúscula
                }
                // Manejar filtro de fecha 'dateOrder'
                else if (key === 'dateOrder') {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        logger.warn(`Invalid date format for filter 'dateOrder': ${value}`);
                        return res.status(400).json({ message: `Formato de fecha inválido para 'dateOrder'.` });
                    }
                    // Para buscar por un día exacto (desde el inicio del día hasta el final)
                    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
                    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
                    queryFilters.dateOrder = {
                        $gte: startOfDay,
                        $lte: endOfDay
                    };
                }
                // Manejar campos numéricos (ej. phoneClient)
                else if (key === 'phoneClient') {
                    const phoneNumber = parseInt(value as string);
                    if (!isNaN(phoneNumber)) {
                        queryFilters[key] = phoneNumber;
                    } else {
                        logger.warn(`Invalid number format for filter '${key}': ${value}`);
                        return res.status(400).json({ message: `Formato de número inválido para el filtro '${key}'.` });
                    }
                }
                // Manejar campos de texto (búsqueda parcial insensible a mayúsculas/minúsculas)
                else if (typeof value === 'string') {
                    // Usar regex para búsquedas parciales en campos de texto, insensible a mayúsculas/minúsculas
                    queryFilters[key] = { $regex: value, $options: 'i' };
                }
                // Otros tipos de filtros (booleanos, etc.)
                else {
                    queryFilters[key] = value;
                }
            }
        }

        // Si no se especifica el tipo, por defecto mostrar solo 'QUOTE'
        if (!queryFilters.type) {
            queryFilters.type = 'QUOTE';
        }
        // Excluye los registros que estan eliminados 
        queryFilters.deleted = false;

        const totalQuotes = await Quote.countDocuments(queryFilters);
        const quotes = await Quote.find(queryFilters)
            .skip(skip)
            .limit(limit)
            .sort({ dateOrder: -1 }); // Ordenar por fecha de creación descendente

        // Calcular totalPay para cada cotización/orden
        const quotesWithTotalPay = quotes.map((quoteDoc: any) => {
            const quote = quoteDoc.toObject({ getters: true }); // Convertir documento Mongoose a objeto JS
            let sum = 0;
            if (quote.partialPayments && Array.isArray(quote.partialPayments)) {
                quote.partialPayments.forEach((payment: any) => {
                    // Asegúrate de que valueTransaction se interprete como número
                    sum += parseFloat(payment.valueTransaction || '0');
                });
            }
            quote.totalPay = sum;
            // Calcular el 'due_amount' (monto adeudado)
            quote.due_amount = quote.total - quote.totalPay;
            return quote;
        });

        const totalPages = Math.ceil(totalQuotes / limit);

        logger.info(`Successfully retrieved ${quotesWithTotalPay.length} quotes out of ${totalQuotes} total.`);
        return res.status(200).json({
            quotes: quotesWithTotalPay,
            total: totalQuotes,
            page,
            limit,
            totalPages
        });
    } catch (error: any) {
        logger.error(`Error fetching quotes: ${error.message}`, error);
        return res.status(500).json({ message: `Error interno del servidor al buscar cotizaciones.` });
    }
}

export async function quotesByIdUser(req: Request, res: Response): Promise<Response> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    logger.info(`Fetching quotes by user ID: ${req.body.idUser} with pagination. Page: ${page}, Limit: ${limit}`);

    try {
        if (!req.body.idUser || !mongoose.Types.ObjectId.isValid(req.body.idUser)) {
            logger.warn(`Invalid or missing user ID provided for quotesByIdUser: ${req.body.idUser}`);
            return res.status(400).send({ message: `ID de usuario inválido o no proporcionado.` });
        }

        const clientUser: any = await User.findOne({ _id: new mongoose.Types.ObjectId(req.body.idUser) });

        if (!clientUser) {
            logger.warn(`User with ID ${req.body.idUser} not found.`);
            return res.status(404).send({ message: `Usuario no encontrado.` });
        }
        if (!clientUser.document) {
            logger.warn(`User ${req.body.idUser} has no document for quote lookup.`);
            return res.status(400).send({ message: `El usuario no tiene un documento asociado para buscar cotizaciones.` });
        }

        const queryFilters = { idClient: clientUser.document };

        const totalQuotes = await Quote.countDocuments(queryFilters);
        const quotes = await Quote.find(queryFilters)
            .skip(skip)
            .limit(limit)
            .sort({ dateOrder: -1 });

        const totalPages = Math.ceil(totalQuotes / limit);

        logger.info(`Found ${quotes.length} quotes for user document: ${clientUser.document} out of ${totalQuotes} total.`);
        return res.status(200).json({
            quotes,
            total: totalQuotes,
            page,
            limit,
            totalPages
        });
    } catch (error: any) {
        logger.error(`Error fetching quotes by user ID ${req.body.idUser}: ${error.message}`, error);
        return res.status(500).send({ message: `Error interno del servidor al buscar cotizaciones por usuario.` });
    }
}

export async function quoteByIdQuote(req: Request, res: Response): Promise<Response> {
    logger.info(`Fetching quote by Quote ID: ${req.params.idQuote}`);

    try {
        if (!req.params.idQuote || !mongoose.Types.ObjectId.isValid(req.params.idQuote)) {
            logger.warn(`Invalid or missing Quote ID provided for quoteByIdQuote: ${req.params.idQuote}`);
            return res.status(400).send({ message: `ID de cotización inválido o no proporcionado.` });
        }

        const result = await Quote.findOne({ _id: new mongoose.Types.ObjectId(req.params.idQuote) });

        if (!result) {
            logger.info(`Quote with ID ${req.params.idQuote} not found.`);
            return res.status(404).send({ message: `No se encuentra la cotización: ${req.params.idQuote}` });
        }

        logger.info(`Successfully retrieved quote with ID: ${req.params.idQuote}`);
        return res.status(200).send(result);
    } catch (error: any) {
        logger.error(`Error fetching quote by Quote ID ${req.params.idQuote}: ${error.message}`, error);
        return res.status(500).send({ message: `Error interno del servidor al buscar la cotización.` });
    }
}

export async function quotePdf(req: Request, res: Response): Promise<any> {
    logger.info(`Generating PDF for quote ID: ${req.params.id}`);
    return new Promise(async (resolve, reject) => {
        try {
            if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
                logger.warn(`Invalid or missing quote ID provided for PDF generation: ${req.params.id}`);
                return res.status(400).send("ID de cotización inválido o no proporcionado para generar PDF.");
            }

            const pathPdf: string = await createPdfFromStrHtml(req.params.id, typeObject.quote);
            logger.debug(`PDF path generated: ${pathPdf}`);

            try {
                await fs.promises.access(pathPdf, fs.constants.F_OK); // Check if file exists
                logger.info(`PDF file found at: ${pathPdf}. Sending file.`);
                res.status(200).sendFile(pathPdf, (err) => {
                    if (err) {
                        logger.error(`Error sending PDF file ${pathPdf}: ${err.message}`, err);
                        // No need to send another response as headers might already be sent
                    } else {
                        logger.info(`PDF file ${pathPdf} sent successfully.`);
                    }
                    // Optional: Clean up the temporary PDF file after sending
                    // fs.unlink(pathPdf, (unlinkErr) => {
                    //     if (unlinkErr) {
                    //         logger.warn(`Failed to delete temporary PDF file ${pathPdf}: ${unlinkErr.message}`);
                    //     } else {
                    //         logger.debug(`Temporary PDF file ${pathPdf} deleted.`);
                    //     }
                    // });
                });
                resolve(true); // Resolve the promise as the response is handled
            } catch (fileError: any) {
                logger.warn(`PDF file not found at ${pathPdf} for quote ID ${req.params.id}: ${fileError.message}`);
                res.status(404).send("Archivo PDF no encontrado."); // 404 Not Found
                resolve(false);
            }
        } catch (error: any) {
            logger.error(`Error generating PDF for quote ID ${req.params.id}: ${error.message}`, error); // Changed console.error to logger.error
            if (!res.headersSent) { // Ensure response is not already sent
                res.status(500).send("Error interno del servidor al generar el PDF.");
            }
            reject(error); // Reject the promise on error
        }
    });
}

export async function deleteQuote(req: Request, res: Response): Promise<Response> {
    const user: any = req.user;
    logger.info(`Attempting to change 'deleted' status for quote ID: ${req.body.id} by user: ${user?.email || 'N/A'}`);

    if (!user || user.role !== "Admin") {
        logger.warn(`Unauthorized attempt to change quote deleted status by user: ${user?.email || 'N/A'}. Role: ${user?.role || 'N/A'}`);
        return res.status(403).send({ message: `Usuario no autorizado para realizar esta acción.` }); // 403 Forbidden
    }

    try {
        if (!req.body.id || !mongoose.Types.ObjectId.isValid(req.body.id)) {
            logger.warn(`Invalid quote ID provided for delete/restore operation: ${req.body.id}`);
            return res.status(400).send({ message: `ID de cotización inválido o no proporcionado.` });
        }
        if (typeof req.body.deleted !== 'boolean') {
            logger.warn(`Invalid 'deleted' status provided for quote ID ${req.body.id}: ${req.body.deleted}`);
            return res.status(400).send({ message: `El estado 'deleted' es requerido y debe ser un valor booleano (true/false).` });
        }

        const updatedQuote = await Quote.findByIdAndUpdate({ _id: req.body.id }, { $set: { deleted: !req.body.deleted } }, { new: true });

        if (updatedQuote) {
            logger.info(`Quote ${req.body.id} 'deleted' status updated to ${req.body.deleted} successfully.`);
            return res.status(200).send({ success: `Cotización actualizada: ${req.body.id}`, newStatus: updatedQuote.deleted });
        } else {
            logger.warn(`Quote ${req.body.id} not found for update 'deleted' status.`);
            return res.status(404).send({ message: `Cotización con ID ${req.body.id} no encontrada.` });
        }
    } catch (err: any) {
        logger.error(`Error updating 'deleted' status for quote ID ${req.body.id}: ${err.message}`, err); // Changed console.error to logger.error
        return res.status(500).send({ message: `Error interno del servidor al actualizar la cotización: ${req.body.id}` });
    }
}

export async function createPartialPay(req: Request, res: Response): Promise<Response> {
    logger.info(`Attempting to create partial payment for order ID: ${req.body.orderId}`);

    try {
        // Parse valueTransaction to a number immediately
        const valueTransaction = parseFloat(req.body.valueTransaction);

        if (!req.file) {
            logger.warn(`No payment support file provided for order ID: ${req.body.orderId}`);
            return res.status(400).json({ message: `No se encuentra el soporte del pago` });
        }
        if (!req.body.orderId || !mongoose.Types.ObjectId.isValid(req.body.orderId)) {
            logger.warn(`Invalid order ID provided for partial payment: ${req.body.orderId}`);
            return res.status(400).json({ message: `ID de pedido inválido o no proporcionado.` });
        }

        // Use the parsed valueTransaction for validation
        if (isNaN(valueTransaction) || valueTransaction <= 0) {
            logger.warn(`Invalid 'valueTransaction' provided for order ID ${req.body.orderId}: ${req.body.valueTransaction}`);
            return res.status(400).json({ message: `El valor de la transacción debe ser un número positivo.` });
        }

        const RESULTSEARCH: any = await Quote.findById(req.body.orderId);

        if (!RESULTSEARCH) {
            logger.warn(`Order with ID ${req.body.orderId} not found for partial payment.`);
            return res.status(404).json({ message: `No fue posible encontrar el pedido para el pago parcial.` });
        }

        let currentSaldo = parseFloat(RESULTSEARCH.total || 0); // Ensure total is treated as a number
        if (RESULTSEARCH.partialPayments && Array.isArray(RESULTSEARCH.partialPayments)) {
            RESULTSEARCH.partialPayments.forEach((element: any) => {
                currentSaldo -= parseFloat(element.valueTransaction || 0);
            });
        }

        // Use the parsed valueTransaction for comparison
        if (valueTransaction > currentSaldo + 0.01) { // Add a small epsilon for floating point comparison
            logger.warn(`Payment value ${valueTransaction} exceeds pending amount ${currentSaldo} for order ${req.body.orderId}.`);
            return res.status(400).json({ message: `El valor asignado supera el valor pendiente.` });
        }

        const NEWREGISTER = {
            dateTransaction: req.body.dateTransaction || new Date(),
            valueTransaction: valueTransaction, // Use the parsed value
            metodTransaction: req.body.metodTransaction || 'Desconocido',
            fileSupport: req.file.path.split('/').pop(),
        }

        RESULTSEARCH.partialPayments.push(NEWREGISTER);
        RESULTSEARCH.due_amount = parseFloat((currentSaldo - valueTransaction).toFixed(2)); // Use the parsed value
        await RESULTSEARCH.save();
        logger.info(`Partial payment of ${valueTransaction} created for order ${req.body.orderId}. New due amount: ${RESULTSEARCH.due_amount}`);

        const orderLink = `${req.headers.origin}/orders/quote/${req.body.orderId}`;
        const emailSubject = `Se registró su pago de ${valueTransaction} en la orden ${req.body.orderId}`; // Use the parsed value

        const sendEmail = await functSendAlertEmail([req.body.emailClient], emailSubject, orderLink);
        if (!sendEmail) {
            logger.error(`Failed to send email alert to client ${req.body.emailClient} for partial payment on order ${req.body.orderId}.`);
        } else {
            logger.info(`Email alert sent to client ${req.body.emailClient} for partial payment on order ${req.body.orderId}.`);
        }

        // let sendWht = await functWhatsappToPhone("57", req.body.phoneClient.toString(), `Se creó su pago de ${valueTransaction} de la orden ${req.body.orderId}`);
        // if (!sendWht) { logger.error("No se envio la alerta al whatsapp"); };

        return res.status(200).json({ success: `Pago parcial de ${valueTransaction} creado exitosamente.`, newDueAmount: RESULTSEARCH.due_amount }); // Use the parsed value

    } catch (err: any) {
        logger.error(`Error creating partial payment for order ID ${req.body.orderId}: ${err.message}`, err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: `Error de validación: ${err.message}` });
        }
        return res.status(500).json({ message: `Error interno del servidor al procesar el pago parcial.` });
    }
}

export async function getUnpaidInvoices(req: Request, res: Response): Promise<Response> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    logger.info(`Fetching unpaid invoices with pagination. Page: ${page}, Limit: ${limit}. Query params: ${JSON.stringify(req.query)}`);
    try {
        const { idUser } = req.query;

        const filter: any = {
            type: 'ORDER', // Assuming 'ORDER' represents a pending invoice. Adjust if needed.
            deleted: false,
            due_amount: { $gt: 0 },
        };

        // If idUser is provided, add it to the filter after validation
        if (idUser && typeof idUser === 'string') {
            if (mongoose.Types.ObjectId.isValid(idUser)) {
                filter.idUser = new mongoose.Types.ObjectId(idUser);
                logger.debug(`Filtering unpaid invoices by idUser: ${idUser}`);
            } else {
                logger.warn(`Invalid idUser provided for getUnpaidInvoices: ${idUser}`);
                return res.status(400).json({ message: "ID de usuario proporcionado no es un ObjectId válido." });
            }
        } else {
            // If no idUser is provided in query, ensure idUser exists and is not null in DB
            filter.idUser = { $exists: true, $ne: null };
        }


        const totalUnpaidInvoices = await Quote.countDocuments(filter);
        const unpaidInvoices = await Quote.find(filter)
            .select('idQuote idClient idUser clientNames clientLastnames dateOrder createdAt total due_amount company')
            .skip(skip)
            .limit(limit)
            .sort({ dateOrder: -1 })
            .exec();

        const totalPages = Math.ceil(totalUnpaidInvoices / limit);

        logger.info(`Found ${unpaidInvoices.length} unpaid invoices out of ${totalUnpaidInvoices} total.`);
        return res.status(200).json({
            invoices: unpaidInvoices,
            total: totalUnpaidInvoices,
            page,
            limit,
            totalPages
        });

    } catch (error: any) {
        logger.error(`Error in getUnpaidInvoices: ${error.message}`, error);
        return res.status(500).json({ message: "Error interno del servidor al generar el reporte de facturas pendientes." });
    }
}

export async function getClientsDebtSummary(req: Request, res: Response): Promise<Response> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    logger.info(`Fetching clients debt summary with pagination. Page: ${page}, Limit: ${limit}`);

    try {
        // 1. Condición de filtro base para todos los pipelines
        const baseMatch: any = {
            deleted: false,
            due_amount: { $gt: 0 },
            type: 'ORDER',
            idUser: { $exists: true, $ne: null }
        };

        // 2. Construir la condición de filtro por nombre si existe en la consulta
        if (req.query.clientName) {
            const clientNameRegex = new RegExp(req.query.clientName as string, 'i');
            // Usamos $or para buscar en clientNames o clientLastnames
            baseMatch.$or = [
                { clientNames: { $regex: clientNameRegex } },
                { clientLastnames: { $regex: clientNameRegex } }
            ];
            logger.info(`Filter by clientName applied: ${req.query.clientName}`);
        }

        // 3. Pipeline para el conteo total
        const countPipeline: PipelineStage[] = [
            { $match: baseMatch }, // Aplica los filtros base y de nombre
            { $group: { _id: '$idUser' } },
            { $count: 'totalClients' }
        ];

        const countResult = await Quote.aggregate(countPipeline).exec();
        const totalClients = countResult.length > 0 ? countResult[0].totalClients : 0;

        // 4. Pipeline para obtener los datos paginados
        const aggregationPipeline: PipelineStage[] = [
            { $match: baseMatch }, // Aplica los mismos filtros
            {
                $group: {
                    _id: '$idUser',
                    clientNames: { $first: '$clientNames' },
                    clientLastnames: { $first: '$clientLastnames' },
                    totalOwed: { $sum: '$due_amount' }
                }
            },
            { $sort: { totalOwed: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    clientName: { $concat: ['$clientNames', ' ', '$clientLastnames'] },
                    totalOwed: { $round: ['$totalOwed', 2] }
                }
            }
        ];

        const debtSummary = await Quote.aggregate(aggregationPipeline).exec();
        const totalPages = Math.ceil(totalClients / limit);

        logger.info(`Generated debt summary for ${debtSummary.length} clients out of ${totalClients} total.`);
        return res.status(200).json({
            summary: debtSummary,
            total: totalClients,
            page,
            limit,
            totalPages
        });

    } catch (error: any) {
        logger.error(`Error in getClientsDebtSummary: ${error.message}`, error);
        return res.status(500).json({ message: "Error interno del servidor al generar el reporte de deuda." });
    }
}