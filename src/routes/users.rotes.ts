import { Router } from 'express'
const router = Router();
import { deleteUser, listUsers, listUsersProject, updateUser, userById, usersByFilterProject } from '../controllers/user.controller'
import passport from 'passport'
import { checkIsInRole } from '../middlewares/passport';
import { UserRole } from '../models/role';

router.get('/listUsers', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), listUsers);

router.get('/listUsersProject', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), listUsersProject);

router.post('/updateUser', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), updateUser);

router.post('/deleteUser', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), deleteUser);

router.get('/userById/:id', passport.authenticate('jwt', { session: false }), userById);

router.post('/userByFilterProject', passport.authenticate('jwt', { session: false }),checkIsInRole(UserRole.ADMIN), usersByFilterProject);

export default router;