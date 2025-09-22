import { Router } from 'express'
import passport from 'passport'

import { createTransferProduct, deleteTransferProduct, getAllTransfersProducts, getTransferProductById, getTransfersProductsByUser, updateTransferProduct } from '../controllers/transferProducts.controller';
import { checkIsInRole } from '../middlewares/passport';
import { UserRole } from '../models/role';

const router = Router();
// Rutas para las transferencias de productos   
router.post('/createTransferProduct', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), createTransferProduct);
router.get('/getAllTransfersProducts', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), getAllTransfersProducts);
router.get('/getTransferProductById/:id', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), getTransferProductById);   
router.get('/getTransfersProductsByUser', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), getTransfersProductsByUser);
router.put('/updateTransferProduct/:id', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), updateTransferProduct);
router.delete('/deleteTransferProduct/:id', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), deleteTransferProduct);

export default router