import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { OrderStatus, Role } from '@coremen/types';

// Cliente - Ver historial de pedidos
export const getClientOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true }
            }
          }
        },
        payment: true,
      },
      // RF-16: Sort active first, then completed. Done in code since Prisma doesn't support custom sort groups natively yet.
      orderBy: { createdAt: 'desc' }
    });

    // Custom sorting: Activos primero (REGISTERED, IN_PRODUCTION, READY_FOR_PICKUP)
    const activeStatuses = [OrderStatus.REGISTERED, OrderStatus.IN_PRODUCTION, OrderStatus.READY_FOR_PICKUP];
    
    orders.sort((a, b) => {
      const aIsActive = activeStatuses.includes(a.status as OrderStatus);
      const bIsActive = activeStatuses.includes(b.status as OrderStatus);
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { productVariant: { include: { product: true } } } },
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Comerciante - Avanzar estado del pedido
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const merchantId = req.user!.userId;

    const order = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status === OrderStatus.IN_PRODUCTION && order.payment?.status !== 'confirmed') {
      return res.status(400).json({ error: 'No se puede avanzar a producción sin pago confirmado' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: status,
            changedBy: merchantId,
            reason
          }
        }
      }
    });

    // TODO: Send notification email to client via Resend
    
    res.json(updated);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
