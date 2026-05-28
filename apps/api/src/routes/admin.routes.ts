import { Router } from 'express';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';
import prisma from '../lib/prisma';
import { logAudit } from '../services/audit.service';
import { sendAccountUnlockedEmail } from '../services/email.service';
import { Request, Response } from 'express';
import { createProduct } from '../controllers/products.controller';

const router = Router();

// ──── Attributes (Categories, Fabrics, Sizes) ──────────────────────────
// Public endpoint so the UI can easily fetch it without strict role barriers
router.get('/attributes', async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true';
  const [categories, fabrics, sizes] = await Promise.all([
    prisma.category.findMany({ where: includeInactive ? undefined : { isActive: true } }),
    prisma.fabricAttribute.findMany({ where: includeInactive ? undefined : { isActive: true } }),
    prisma.sizeAttribute.findMany({ where: includeInactive ? undefined : { isActive: true } })
  ]);
  res.json({ categories, fabrics, sizes });
});

// All admin routes require ADMIN role
router.use(requireRole(Role.ADMIN));

router.post('/categories', async (req: Request, res: Response) => {
  const created = await prisma.category.create({ data: { name: req.body.name } });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'Category', entityId: created.id, newValue: created, ipAddress: req.ip });
  res.status(201).json(created);
});

router.patch('/categories/:id', async (req: Request, res: Response) => {
  const updated = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      name: typeof req.body.name === 'string' ? req.body.name : undefined,
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
    }
  });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'Category', entityId: updated.id, newValue: updated, ipAddress: req.ip });
  res.json(updated);
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  const hasProducts = await prisma.product.findFirst({ where: { categoryId: req.params.id } });
  if (hasProducts) return res.status(409).json({ error: 'No se puede eliminar la categoría porque hay productos que la usan.' });
  await prisma.category.delete({ where: { id: req.params.id } });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'Category', entityId: req.params.id, newValue: { action: 'HARD_DELETE' }, ipAddress: req.ip });
  res.json({ message: 'Categoría eliminada' });
});

router.post('/fabrics', async (req: Request, res: Response) => {
  const created = await prisma.fabricAttribute.create({ data: { value: req.body.value } });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'FabricAttribute', entityId: created.id, newValue: created, ipAddress: req.ip });
  res.status(201).json(created);
});

router.patch('/fabrics/:id', async (req: Request, res: Response) => {
  const updated = await prisma.fabricAttribute.update({
    where: { id: req.params.id },
    data: {
      value: typeof req.body.value === 'string' ? req.body.value : undefined,
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
    }
  });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'FabricAttribute', entityId: updated.id, newValue: updated, ipAddress: req.ip });
  res.json(updated);
});

router.delete('/fabrics/:id', async (req: Request, res: Response) => {
  const hasProducts = await prisma.product.findFirst({ where: { fabricId: req.params.id } });
  if (hasProducts) return res.status(409).json({ error: 'No se puede eliminar la tela porque hay productos que la usan.' });
  await prisma.fabricAttribute.delete({ where: { id: req.params.id } });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'FabricAttribute', entityId: req.params.id, newValue: { action: 'HARD_DELETE' }, ipAddress: req.ip });
  res.json({ message: 'Tela eliminada' });
});

router.post('/sizes', async (req: Request, res: Response) => {
  const created = await prisma.sizeAttribute.create({ data: { value: req.body.value } });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'SizeAttribute', entityId: created.id, newValue: created, ipAddress: req.ip });
  res.status(201).json(created);
});

router.patch('/sizes/:id', async (req: Request, res: Response) => {
  const updated = await prisma.sizeAttribute.update({
    where: { id: req.params.id },
    data: {
      value: typeof req.body.value === 'string' ? req.body.value : undefined,
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
    }
  });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'SizeAttribute', entityId: updated.id, newValue: updated, ipAddress: req.ip });
  res.json(updated);
});

router.delete('/sizes/:id', async (req: Request, res: Response) => {
  const hasVariants = await prisma.productVariant.findFirst({ where: { sizeId: req.params.id } });
  if (hasVariants) return res.status(409).json({ error: 'No se puede eliminar la talla porque hay variantes de producto que la usan.' });
  await prisma.sizeAttribute.delete({ where: { id: req.params.id } });
  await logAudit({ type: 'STOCK_ADJUST', userId: req.user!.userId, entityType: 'SizeAttribute', entityId: req.params.id, newValue: { action: 'HARD_DELETE' }, ipAddress: req.ip });
  res.json({ message: 'Talla eliminada' });
});

// ──── User Management ──────────────────────────────────────────────────
router.post('/products', createProduct);

router.get('/users', async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, lockedUntil: true }
  });
  res.json(users);
});

router.patch('/users/:id/revoke', async (req: Request, res: Response) => {
  const { id } = req.params;
  const previous = await prisma.user.findUnique({ where: { id } });
  const updated = await prisma.user.update({ where: { id }, data: { isActive: false } });
  await logAudit({ type: 'USER_MGMT', userId: req.user!.userId, entityType: 'User', entityId: id, previousValue: { isActive: true }, newValue: { isActive: false }, ipAddress: req.ip });
  res.json(updated);
});

router.patch('/users/:id/unlock', async (req: Request, res: Response) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  await logAudit({ type: 'USER_MGMT', userId: req.user!.userId, entityType: 'User', entityId: req.params.id, newValue: { action: 'UNLOCK' }, ipAddress: req.ip });
  sendAccountUnlockedEmail(user.email).catch(console.error);
  res.json({ message: 'Account unlocked' });
});

router.patch('/users/:id/activate', async (req: Request, res: Response) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true } });
  await logAudit({ type: 'USER_MGMT', userId: req.user!.userId, entityType: 'User', entityId: req.params.id, newValue: { action: 'ACTIVATE' }, ipAddress: req.ip });
  res.json({ message: 'Account activated' });
});

// ──── Discount Management ──────────────────────────────────────────────
router.get('/discounts/volume', async (_req: Request, res: Response) => {
  const rules = await prisma.discountRule.findMany({ orderBy: { minQuantity: 'asc' } });
  res.json(rules);
});

router.post('/discounts/volume', async (req: Request, res: Response) => {
  const rule = await prisma.discountRule.create({ data: req.body });
  await logAudit({ type: 'DISCOUNT_CONFIG', userId: req.user!.userId, entityType: 'DiscountRule', entityId: rule.id, newValue: rule, ipAddress: req.ip });
  res.status(201).json(rule);
});

router.get('/discounts/season', async (_req: Request, res: Response) => {
  const seasons = await prisma.seasonDiscount.findMany({ orderBy: { startDate: 'desc' } });
  res.json(seasons);
});

router.post('/discounts/season', async (req: Request, res: Response) => {
  const season = await prisma.seasonDiscount.create({ data: req.body });
  await logAudit({ type: 'DISCOUNT_CONFIG', userId: req.user!.userId, entityType: 'SeasonDiscount', entityId: season.id, newValue: season, ipAddress: req.ip });
  res.status(201).json(season);
});

// ──── Dashboard & Reports ──────────────────────────────────────────────
router.get('/dashboard', async (_req: Request, res: Response) => {
  const [totalOrders, totalUsers, totalProducts, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.user.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } })
  ]);
  res.json({ totalOrders, totalUsers, totalProducts, recentOrders });
});

router.get('/reports/sales', async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const where: any = {};
  if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom as string) };
  if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo as string) };

  const orders = await prisma.order.findMany({ where, include: { items: true, payment: true }, orderBy: { createdAt: 'desc' } });
  res.json(orders);
});

// ──── Audit Log ────────────────────────────────────────────────────────
router.get('/audit-log', async (req: Request, res: Response) => {
  const { page = '1', limit = '20', type, userId } = req.query;
  const where: any = {};
  if (type) where.type = type;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.auditLog.count({ where })
  ]);
  res.json({ data: logs, meta: { total, page: Number(page), limit: Number(limit) } });
});

// ──── Error Log ────────────────────────────────────────────────────────
router.get('/error-log', async (req: Request, res: Response) => {
  const logs = await prisma.errorLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100 });
  res.json(logs);
});

router.patch('/error-log/:id/review', async (req: Request, res: Response) => {
  const updated = await prisma.errorLog.update({
    where: { id: req.params.id },
    data: { isReviewed: true, reviewedBy: req.user!.userId, reviewedAt: new Date() }
  });
  res.json(updated);
});

export default router;
