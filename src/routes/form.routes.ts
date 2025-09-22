import { Router } from 'express'
import passport from 'passport'
import { countryStates, createDepartment, stateCities } from '../controllers/forms.controller';

const router = Router();

router.get('/countryStates/:country', countryStates); 

router.get('/stateCities/:country/:state', stateCities); 

router.post('/createDepartment', passport.authenticate('jwt', { session: false }), createDepartment); 

export default router