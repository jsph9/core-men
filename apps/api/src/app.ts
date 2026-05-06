import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';

// Route imports
import webhooksRoutes from './routes/webhooks.routes';
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import cartRoutes from './routes/cart.routes';
import checkoutRoutes from './routes/checkout.routes';
import orderRoutes from './routes/order.routes';
import quoteRoutes from './routes/quote.routes';
import merchantRoutes from './routes/merchant.routes';
import customizationRoutes from './routes/customization.routes';
import adminRoutes from './routes/admin.routes';

const app: Express = express();

// ─── Global Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use('/api/webhooks', webhooksRoutes);

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// ─── Health Check ──────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'CoreMen API' });
});

// ─── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/admin', adminRoutes);

// ─── Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
