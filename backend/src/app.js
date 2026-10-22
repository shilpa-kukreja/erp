import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import masterdataRoutes from './modules/masterdata/masterdata.routes.js';
import stockRoutes from './modules/stock/stock.routes.js';
import purchaseRoutes from './modules/purchase/purchase.routes.js';
import dns  from "dns";

const app = express();

app.set('trust proxy', 1); // Required on Render
dns.setServers(["1.1.1.1","8.8.8.8"]);
app.use(helmet());
app.use(cors({
  origin: env.CLIENT_URL.split(',').map((s) => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ ok: true, env: env.NODE_ENV }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/masterdata', masterdataRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;