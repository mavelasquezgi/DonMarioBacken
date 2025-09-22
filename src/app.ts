import express from 'express'
import 'express-async-errors'; 
import morgan from 'morgan'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import passport from 'passport'
import passportMiddleware from './middlewares/passport'
import productRoutes from './routes/products.routes'
import categoryRoutes from './routes/category.routes'
import usersRoutes from './routes/users.rotes'
import uploadRoutes from "./routes/upload.routes";
import quotesRoutes from "./routes/quotes.routes";
import formRoutes from "./routes/form.routes";
import storeRoutes from "./routes/store.routes";
import locationsRoutes from "./routes/locations.routes";
import marksRouttes from "./routes/marks.rotes";
import transferProductsRoutes from './routes/transferProducts.routes';
import companyRoutes from './routes/company.rotes';
import productEntryRoutes from './routes/productEntry.routes';

import { errorHandler } from './helpers/errorHandler'
import path from 'path'

// initializations
const app = express();

//settings
app.set('port', process.env.PORT || 3501);

//middlewares
app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(express.json());
app.use(passport.initialize());
passport.use(passportMiddleware);

//routes
app.get('/', (req, res) => {
    res.send(`The API is at http://localhost:${app.get('port')}`);
});

process.env.TZ = 'America/Bogota';

app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', categoryRoutes);
app.use('/api', usersRoutes);
app.use('/api', uploadRoutes);
app.use('/api', quotesRoutes);
app.use('/api', formRoutes);
app.use('/api', storeRoutes);
app.use('/api', locationsRoutes);
app.use('/api', marksRouttes);
app.use('/api', transferProductsRoutes);
app.use('/api', companyRoutes);
app.use('/api', productEntryRoutes);

app.use(errorHandler);

// this folder is use for save images in this project (products) public files

app.use('./uploads', express.static(path.resolve('uploads')))

export default app;