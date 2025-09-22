import { Router } from 'express'
import passport from 'passport'
import { createMark, deleteMark, marks, marksWithLimit, marksNames, updateMark } from '../controllers/mark.controller';
import { checkIsInRole } from '../middlewares/passport';
import { UserRole } from '../models/role';
import { middlewareUploadMark } from '../middlewares/upload';

const router = Router();

router.post('/createMark', passport.authenticate('jwt', { session: false }),checkIsInRole(UserRole.ADMIN),middlewareUploadMark, createMark);

router.post('/updateMark', passport.authenticate('jwt', { session: false }),checkIsInRole(UserRole.ADMIN),middlewareUploadMark, updateMark);

router.post('/deleteMark', passport.authenticate('jwt', { session: false }),checkIsInRole(UserRole.ADMIN), deleteMark);

router.get('/marksNames', marksNames);

router.get('/marks', marks);

router.get('/marksL/:limit', marksWithLimit);

export default router