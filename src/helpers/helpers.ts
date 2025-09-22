import { Request, Response } from 'express';
import fs from 'fs';
import bcrypt from 'bcrypt';
import Consecutive, { ConsecutiveI } from '../models/consecutives';
import path from 'path';
import config from '../config/config';

export const strAmasLogo = "data:image/png;base64,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";


function fillingNumber(num: number, size: number) {
    var s = "000000000000000" + num.toString();
    return s.slice(s.length - size);
}

export const encryptPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
};

export const typeObject = Object.freeze({
    order: "order",
    quote: "quote",
    product: "product",
});

export const pathFolders: any = {
    "product": config.PATH.URLIMAGESPRODUCT,
    "marks": config.PATH.URLIMAGESMARKS,
    "categories": config.PATH.URLIMAGESCATEGORIES,
    "quote": config.PATH.URLPDFQUOTES,
    "order": config.PATH.URLPDFORDER,
    "supportpay": config.PATH.URLSUPPORTPAY,
    "temp": config.PATH.TEMP,
    "files": config.PATH.FILES
};

export const matchPassword = async (password: string, savedPassword: string): Promise<boolean> => {
    try {
        return await bcrypt.compare(password, savedPassword);
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const imageFilter = function (req: any, image: any, cb: any) {
    if (!image.originalname.match(/\.(jpg|jpeg|png|gif|tiff|svg|webp)$/i)) {
        console.error("Error: Solo se permiten imagenes");
        return cb(null, false);
    }
    cb(null, true);
};

export const imagePdfFilter = function (req: any, image: any, cb: any) {
    if (!image.originalname.match(/\.(jpg|jpeg|png|gif|tiff|svg|webp|pdf)$/i)) {
        return cb(null, false);
    }
    cb(null, true);
};

export const generatePDF = (filePath: string, req: Request, res: Response) => {
    /*var file = fs.createReadStream(filePath);
    var stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
    file.pipe(res);
    */
    var data = fs.readFileSync(filePath);
    res.contentType("application/pdf");
    res.send(data);
}

export const getConsecutive = async (type: string, nameCompany: string, idCompany: string, typeCompany: string) => {
    try {
        let consecutiveObj: any = undefined;
        consecutiveObj = await Consecutive.findOne({ $and: [{ nameCompany: nameCompany }, { idCompany: idCompany }, { typeCompany: typeCompany }] });
        if (consecutiveObj == null) {
            const consecutive: ConsecutiveI = new Consecutive({ nameCompany, idCompany, typeCompany, order: 0, preorder: 0, quote: 0, product: 0 });
            consecutiveObj = await consecutive.save()
        }
        switch (type) {
            case typeObject.order:
                await Consecutive.findByIdAndUpdate(consecutiveObj._id, { $inc: { order: 1 }, upsert: true });
                break;
            case typeObject.quote:
                await Consecutive.findByIdAndUpdate(consecutiveObj._id, { $inc: { quote: 1 }, upsert: true });
                break;
            case typeObject.product:
                await Consecutive.findByIdAndUpdate(consecutiveObj._id, { $inc: { product: 1 }, upsert: true });
                break;
            default:
                break;
        }
        return fillingNumber(consecutiveObj.get(type) + 1, 6);
    }
    catch (error) {
        console.error("Error consecutive ", error)
        return -1;
    }
}

export const generateImage = (filePath: string, req: Request, res: Response) => {
    try {
        var stat = fs.statSync(filePath);
        var total = stat.size;
        if (req.headers.range) {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];

            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var readStream = fs.createReadStream(filePath, { start: start, end: end });
            res.writeHead(206, {
                'Connection': 'keep-alive',
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Content-Length': total,
                'Accept-Ranges': 'bytes',
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename='${path.basename(filePath)}`
            });
            readStream.pipe(res);
        } else {
            res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'image/*' });
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ "error": "range error" });
    }
}

export function ascendentObjCompare(property: string) {

    return function (a: any, b: any) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result;
    }
}

export function descendentObjCompare(property: string) {
    return function (a: any, b: any) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? 1 : (a[property] > b[property]) ? -1 : 0;
        return result;
    }
}

export function sanitizeAndAccentRegex(text: string): string {
    const acentos: Record<string, string> = {
        'á': '[aá]', 'é': '[eé]', 'í': '[ií]', 'ó': '[oó]', 'ú': '[uú]',
        'Á': '[AÁ]', 'É': '[EÉ]', 'Í': '[IÍ]', 'Ó': '[OÓ]', 'Ú': '[UÚ]'
    };

    return text.replace(/([áéíóúÁÉÍÓÚ])|([.*+?^${}()|[\]\\])/g, (match, accentedChar, specialChar) =>
        accentedChar ? acentos[accentedChar] : `\\${specialChar}`
    );
}


export function splitBySpaceStr(chainStr: string) {
    return chainStr.trim().split(/\s+/).filter(Boolean);
}

export function variations(arr: Array<any>) {
    let result: Array<any> = [];

    // Función auxiliar recursiva
    function generateVariations(prefix: any, remaining: any) {
        if (prefix.length === arr.length) {
            result.push(prefix);
            return;
        }

        for (let i = 0; i < remaining.length; i++) {
            const newPrefix = prefix.concat(remaining[i]);
            const newRemaining = remaining.slice(0, i).concat(remaining.slice(i + 1));
            generateVariations(newPrefix, newRemaining);
        }
    }

    generateVariations([], arr);
    return result;
}

export function isValidString(val: any) {
    return typeof val === 'string' && val.trim() !== '';
}


export const spanishStopWords = new Set([
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'una', 'para', 'con',
    'no', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'o', 'este', 'ha', 'si', 'porque', 'esta', 'estos',
    'estas', 'es', 'son', 'han', 'fue', 'fueron', 'ser', 'mi', 'tu', 'su', 'nuestro', 'vuestro', 'suya', 'cuyo',
    'donde', 'cuando', 'quien', 'cual', 'cuanto', 'cada', 'todo', 'todos', 'toda', 'todas', 'le', 'les', 'me',
    'te', 'nos', 'os', 'se', 'yo', 'tu', 'el', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'mí', 'ti', 'él',
    'ella', 'ello', 'aquí', 'ahí', 'allí', 'acá', 'allá', 'arriba', 'abajo', 'antes', 'después', 'durante', 'mientras',
    'desde', 'hasta', 'hacia', 'entre', 'sobre', 'bajo', 'sin', 'contra', 'según', 'ante', 'tras', 'mediante', 'durante',
    'salvo', 'excepto', 'incluso', 'inclusive', 'además', 'asimismo', 'entonces', 'luego', 'así', 'incluso',
    'también', 'tampoco', 'aun', 'aún', 'ya', 'solo', 'solamente', 'casi', 'quizá', 'quizás', 'tal', 'vez',
    'apenas', 'mucho', 'poco', 'demasiado', 'bastante', 'tan', 'tanto', 'mayor', 'menor', 'mejor', 'peor', 'ni'
]);

export function singularizarWord(palabra: string) {
    const excepciones: { [key: string]: string } = {
        "los": "el",       // Artículo
        "las": "la",
        "unos": "uno",
        "unas": "una",
        "crisis": "crisis", // Invariables
        "tórax": "tórax"
    };

    if (Object.prototype.hasOwnProperty.call(excepciones, palabra)) return excepciones[palabra];

    // Reglas generales
    if (/ces$/i.test(palabra)) return palabra.replace(/ces$/i, 'z');
    if (/es$/i.test(palabra)) return palabra.replace(/es$/i, '');
    if (/[aeiou]s$/i.test(palabra)) return palabra.slice(0, -1);

    return palabra;
}

export function generateWordVariations(phrase: string) {
    // Definir las substituciones de letras que no cambian la pronunciación.
    const substitutions: { [key: string]: string[] } = {
        'b': ['b', 'v'],
        'v': ['v', 'b'],
        'c': ['c', 's', 'z', 'x'],
        's': ['s', 'c', 'z'],
        'z': ['z', 'c', 's'],
        'x': ['x', 'c', 's'], // 'x' también puede sonar como 's' o 'ks'
        'll': ['ll', 'y'],
        'y': ['y', 'll'],
        'g': ['g', 'j'], // Depende de la vocal siguiente (ej. "gente" vs "gato")
        'j': ['j', 'g'],  // Depende de la vocal siguiente
        'q': ['q', 'k'], // En algunos casos, 'q' puede sonar como 'k'
        'k': ['k', 'c', 'q'], // En algunos casos, 'k' puede sonar como 'c'
    };

    // Función auxiliar para generar variaciones de una sola palabra
    const getVariations = (word: string) => {
        let variations = new Set([word]);
        const lowerCaseWord = word.toLowerCase();

        for (const char in substitutions) {
            const regex = new RegExp(char, 'g');
            if (lowerCaseWord.match(regex)) {
                let currentVariations = new Set<string>();
                for (const existingVariation of variations) {
                    for (const subChar of substitutions[char as keyof typeof substitutions]) {
                        // Reemplazar la letra original con su variación.
                        const newVariation = existingVariation.replace(regex, subChar);
                        currentVariations.add(newVariation);
                    }
                }
                if (currentVariations.size > 0) {
                    variations = new Set<string>([...variations, ...currentVariations]);
                }
            }
        }
        return Array.from(variations);
    };

    // 1. Convertir la frase a minúsculas y dividirla en palabras.
    const words = phrase.toLowerCase().split(/\s+/);

    // 2. Filtrar las "stop words" y generar variaciones.
    let variedWords = [];
    for (const word of words) {
        // Limpiar la palabra de signos de puntuación ANTES de verificar
        const cleanedWord = word.replace(/[.,!?;:()]/g, '');
        
        // Verificar contra las stop words usando la palabra limpia
        if (!spanishStopWords.has(cleanedWord)) {
            // Generar variaciones de la palabra limpia (sin puntuación)
            variedWords.push(...getVariations(cleanedWord));
        }
    }

    // Retornar un arreglo de palabras únicas para evitar duplicados
    return [...new Set(variedWords)];
}

export function createUnorderedSearchRegex(keywords: string[]): RegExp {
  // Escapar caracteres especiales para regex
  const escapedKeywords = keywords.map(word => 
    word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  );
  
  // Crear lookaheads para cada palabra
  const lookaheads = escapedKeywords.map(
    keyword => `(?=.*\\b${keyword}\\b)`
  ).join('');

  // Combinar con patrón que coincida con todo el texto
  const regexPattern = `^${lookaheads}.*$`;

  return new RegExp(regexPattern, 'i'); // 'i' para case insensitive
}