import { Router } from 'express'
import passport from 'passport';
import { quotePdf, createQuote, quoteByIdQuote, quotes, editeQuote, deleteQuote, quotesByIdUser, createPartialPay, quoteToOrder, getUnpaidInvoices, getClientsDebtSummary } from '../controllers/quotes.controller';
import { checkIsInRole } from '../middlewares/passport';
import { UserRole } from '../models/role';
import { middlewareUploadSupport } from '../middlewares/upload';

const router = Router();

router.post('/createQuote',passport.authenticate('jwt', { session: false }),checkIsInRole(UserRole.ADMIN, UserRole.SELLER), createQuote);

router.get('/quotes', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), quotes);

router.post('/quotesByIdUser', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), quotesByIdUser);

router.post('/editeQuote', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), editeQuote);

router.post('/quoteToOrder', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), quoteToOrder);

router.get('/quotePdf/:id', quotePdf);

router.get('/quoteByIdQuote/:idQuote', quoteByIdQuote);

router.post('/deleteQuote', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), deleteQuote);

router.post('/createPartialPay', middlewareUploadSupport, passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), createPartialPay);

router.get('/getUnpaidInvoices', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), getUnpaidInvoices);

router.get('/getClientsDebtSummary', passport.authenticate('jwt', { session: false }), checkIsInRole(UserRole.ADMIN, UserRole.SELLER), getClientsDebtSummary);

export default router