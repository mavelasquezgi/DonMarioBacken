import { Router } from 'express'
import passport from 'passport'
import { createProduct, createProductManual, deleteProduct, editProduct, editProductNotFile, getImage, getProductsWithLocations, pdfProductsFiltered, product, products, productsAdmin, productsAll, productsByCategories, productsByCategory, productsByFilter, productsById, productsByListIds, productsByName, productsFeatured, productsManual } from '../controllers/products.controllers';
import { checkIsInRole } from '../middlewares/passport';
import { middlewareUploadProduct } from '../middlewares/upload';
import { UserRole } from '../models/role';

const router = Router();

router.post('/createProduct', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SUPPLIER), middlewareUploadProduct, createProduct);

router.post('/createProductManual', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), createProductManual);

router.post('/editProduct', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SUPPLIER), middlewareUploadProduct, editProduct);

router.post('/editProductNotFile', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SUPPLIER), editProductNotFile);

router.post('/deleteProduct', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SUPPLIER), deleteProduct);

router.post('/productsByCategory', productsByCategory);

router.post('/productsByCategories', productsByCategories);

router.get('/products/:location', products);

router.get('/productsAdmin',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SUPPLIER), productsAdmin);

router.get('/productsManual/:location', productsManual);

router.post('/productsFeatured/:location', productsFeatured);

router.get('/product/:id', product);

router.get('/productsAll/:location', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SUPPLIER), productsAll);

router.get('/getimg/:img', getImage);

router.get('/productsByName/:name/:location', productsByName);

router.post('/productsByFilter/:location', productsByFilter);

router.post('/productsByListIds', productsByListIds);

router.get('/productsById/:id/:location', productsById);

router.get('/productsByFilter/pdfProductsFiltered/:id', pdfProductsFiltered);

router.get('/getProductsWithLocations', getProductsWithLocations);

export default router
