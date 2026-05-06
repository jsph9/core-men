import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { QuoteStatus, Role } from '@coremen/types';

// Cliente - Crear cotización
export const createQuote = async (req: Request, res: Response) => {
  try {
    const { garmentType, fabricType, color, totalQuantity, designImageUrl, designZone, designX, designY, designScaleX, designScaleY, designRotation, message, items } = req.body;
    const clientId = req.user!.userId;

    const quote = await prisma.quote.create({
      data: {
        clientId,
        garmentType,
        fabricType,
        color,
        totalQuantity,
        designImageUrl,
        designZone,
        designX,
        designY,
        designScaleX,
        designScaleY,
        designRotation,
        message,
        status: QuoteStatus.PENDING,
        items: {
          create: items.map((item: any) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity
          }))
        },
        statusHistory: {
          create: {
            toStatus: QuoteStatus.PENDING,
            changedBy: clientId,
            note: 'Cotización solicitada por el cliente'
          }
        }
      }
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Comerciante - Responder con precio
export const respondToQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quotedPrice, merchantMessage } = req.body;
    const merchantId = req.user!.userId;

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.status !== QuoteStatus.PENDING && quote.status !== QuoteStatus.UNFEASIBLE) {
      return res.status(400).json({ error: 'Cotización no válida para ser respondida' });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        quotedPrice,
        merchantMessage,
        status: QuoteStatus.QUOTED,
        statusHistory: {
          create: {
            fromStatus: quote.status,
            toStatus: QuoteStatus.QUOTED,
            changedBy: merchantId,
            note: 'Comerciante respondió con un precio'
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Respond quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cliente - Aprobar cotización
export const approveQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientId = req.user!.userId;

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.clientId !== clientId || quote.status !== QuoteStatus.QUOTED) {
      return res.status(400).json({ error: 'Operación inválida' });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.APPROVED,
        statusHistory: {
          create: {
            fromStatus: quote.status,
            toStatus: QuoteStatus.APPROVED,
            changedBy: clientId,
            note: 'Cliente aprobó la cotización'
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Approve quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Comerciante - Marcar como inviable
export const markUnfeasible = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { unfeasibleReason } = req.body;
    const merchantId = req.user!.userId;

    const merchant = await prisma.user.findUnique({ where: { id: merchantId } });
    const whatsappUrl = `https://wa.me/${merchant?.whatsappNumber || ''}?text=${encodeURIComponent(
      `Hola, me contacto por la cotización #${id} en CoreMen. ¿Podemos explorar alternativas?`
    )}`;

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.status !== QuoteStatus.PENDING) {
      return res.status(400).json({ error: 'Cotización no válida para ser marcada como inviable' });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        unfeasibleReason,
        whatsappUrl,
        status: QuoteStatus.UNFEASIBLE,
        statusHistory: {
          create: {
            fromStatus: quote.status,
            toStatus: QuoteStatus.UNFEASIBLE,
            changedBy: merchantId,
            note: 'Marcado inviable por el comerciante'
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Unfeasible quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
