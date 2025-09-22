import { Router } from 'express'
const router = Router();
import { signUp, signIn, changePassword, confirmation, tokenNotLogin } from '../controllers/user.controller'
import passport from 'passport'

router.post('/signup', signUp);

router.get('/confirmation/:token', confirmation);

router.post('/signin', signIn);

router.post('/changepassword', passport.authenticate('jwt', { session: false }), changePassword);

router.post('/tokenNotLogin', tokenNotLogin);

export default router;