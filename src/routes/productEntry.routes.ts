// routes/productEntry.routes.ts
import express from 'express';
import passport from 'passport';
import { checkIsInRole } from '../middlewares/passport'; // Adjust the path if necessary
import { UserRole } from '../models/role'; // Adjust the path if necessary
import { createProductEntry, deleteProductEntry, getAllActiveProductEntries, getAllProductEntries, getProductEntriesByUser, getProductEntryById, updateProductEntry } from '../controllers/productEntry.controller'; // Adjust the path if necessary

const router = express.Router();

router.post('/product-entries', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), createProductEntry);

router.get('/product-entries', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN),getAllActiveProductEntries);

router.get('/product-entries/all', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), getAllProductEntries);

router.get('/product-entries/user', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), getProductEntriesByUser);

router.get('/product-entries/:id', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), getProductEntryById);

router.put('/product-entries/:id', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), updateProductEntry);

router.delete('/product-entries/:id', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), deleteProductEntry);


export default router;