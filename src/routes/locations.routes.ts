import { Router } from 'express'
import passport from 'passport'
import { createLocation, deleteLocation, locations, locationsByListIdAndStore, locationsByProduct, locationsByProductsStore, updateLocation } from '../controllers/locations.controller';

const router = Router();

router.post('/createLocation', passport.authenticate('jwt', { session: false }), createLocation);

router.put('/updateLocation', passport.authenticate('jwt', { session: false }), updateLocation);

router.delete('/deleteLocation', passport.authenticate('jwt', { session: false }), deleteLocation);

router.post('/locationsByProduct', passport.authenticate('jwt', { session: false }), locationsByProduct);

router.post('/locationsByProductsStore', passport.authenticate('jwt', { session: false }), locationsByProductsStore);

router.get('/locations', passport.authenticate('jwt', { session: false }), locations);

router.post('/locationsByListIdAndStore', passport.authenticate('jwt', { session: false }), locationsByListIdAndStore);

router.get('/storesNames', locations);

export default router