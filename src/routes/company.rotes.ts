import express from 'express';
import { createCompany, updateCompany, deleteCompany, companiesNames, companies, companiesWithLimit, companiesActive, companyById } from '../controllers/company.controller'; // Ajusta la ruta si es necesario
import passport from 'passport';
import { checkIsInRole } from '../middlewares/passport';
import { UserRole } from '../models/role';

const router = express.Router();

router.post('/companies',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), createCompany);
router.put('/companies/:id',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), updateCompany);
router.delete('/companies/:id',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), deleteCompany);
router.get('/companies/names',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), companiesNames);
router.get('/companies',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), companiesActive);
router.get('/companies/all',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), companies);
router.get('/companies/limit/:limit',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), companiesWithLimit);
router.get('/companies/:id',passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN), companyById);

export default router;