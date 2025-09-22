import { Router } from 'express'
import passport from 'passport'
import { categoryControllers } from "../controllers/category.controller";
import { middlewareUploadCategory } from '../middlewares/upload';

const router = Router();

router.get('/categoriesAll', categoryControllers.categoriesAll);

router.get('/categoriesL/:limit', categoryControllers.categoriesL);

router.get('/categories', categoryControllers.categories);

router.post('/createCategory', passport.authenticate('jwt', { session: false }), middlewareUploadCategory, categoryControllers.createCategory);

router.post('/updateCategory', passport.authenticate('jwt', { session: false }), middlewareUploadCategory, categoryControllers.updateCategory);

router.post('/deleteCategory', passport.authenticate('jwt', { session: false }), categoryControllers.deleteCategory);

router.get('/listCategoriesByLine', categoryControllers.listCategoriesByLine);

export default router