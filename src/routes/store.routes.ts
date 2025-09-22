import { Router } from 'express'
import passport from 'passport'
import { createStore, deleteStore, getStoresByFilter, stores, storesNames, updateStore } from '../controllers/stores.controllers';
import { checkIsInRole } from '../middlewares/passport';
import { UserRole } from '../models/role';

const router = Router();

router.get('/storesNames', storesNames); 

router.get('/stores', stores);

router.post('/createStore', passport.authenticate('jwt', { session: false }),checkIsInRole(UserRole.ADMIN, UserRole.STORE), createStore); 

router.put('/stores/:id', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.STORE), updateStore);

router.post('/deleteStore', passport.authenticate('jwt', { session: false }),checkIsInRole(UserRole.ADMIN, UserRole.STORE), deleteStore); 

router.get('/stores/filter', getStoresByFilter); 

export default router