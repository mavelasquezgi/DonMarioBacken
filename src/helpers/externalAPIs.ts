import config from '../config/config';
import path from 'path';
import util from 'util'
import child_process from 'child_process'
import { pathFolders } from './helpers';

export const createPdfFromStrHtml = async (idQuote: string, activeFunc: string = "pdfOfText"): Promise<string> => {
    const pathPdf = path.join(pathFolders[activeFunc],`${idQuote}.pdf`);
    const pythonHtmlToPdf = path.join(config.EXTERNAL_API.PYTHONSCRIPTS,"htmlStrToPdf.py");
    const exec = util.promisify(child_process.exec); 
    const { stdout, stderr } = await exec(`python3 ${pythonHtmlToPdf} "${activeFunc}" "${idQuote}" "${pathPdf}"`);
    if (stderr) {
        console.error("Error: ",stderr);
        return ""
    }
    return pathPdf;
}