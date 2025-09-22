import { Router } from 'express'
import { getFile, downloadPdf } from '../controllers/upload.controllers';

const router = Router();

router.get('/getFile/:folder/:file', getFile);

router.get('/downloadPdf/:folder/:file', downloadPdf);

export default router