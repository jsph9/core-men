import { Request, Response } from 'express';
import { OrderRepository } from '../repositories/order.repository';
import { OrderStatus } from '@coremen/types';
import { generateOrderReceipt } from '../services/pdf.service';

// Cliente - Ver historial de pedidos
export const getClientOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const orders = await OrderRepository.findManyByUserId(userId);

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

    const order = await OrderRepository.findByIdWithDetails(id);

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

    const order = await OrderRepository.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status === OrderStatus.IN_PRODUCTION && order.payment?.status !== 'confirmed') {
      return res.status(400).json({ error: 'No se puede avanzar a producción sin pago confirmado' });
    }

    const updated = await OrderRepository.updateStatus(id, status, order.status as OrderStatus, merchantId, reason);

    // TODO: Send notification email to client via Resend
    
    res.json(updated);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadOrderReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const order = await OrderRepository.findByIdWithReceiptDetails(id);

    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const buffer = await generateOrderReceipt(order);
    const receiptType = order.receiptType || 'boleta';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receiptType}-${order.id}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
