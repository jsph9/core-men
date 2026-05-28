import { Request, Response } from 'express';
import { QuoteRepository } from '../repositories/quote.repository';
import { UserRepository } from '../repositories/user.repository';
import { QuoteStatus } from '@coremen/types';

export const getClientQuotes = async (req: Request, res: Response) => {
  try {
    const clientId = req.user!.userId;
    const quotes = await QuoteRepository.findManyByClientId(clientId);
    res.json(quotes);
  } catch (error) {
    console.error('Get client quotes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cliente - Crear cotización
export const createQuote = async (req: Request, res: Response) => {
  try {
    const { garmentType, fabricType, color, totalQuantity, designImageUrl, designZone, designX, designY, designScaleX, designScaleY, designRotation, message, items } = req.body;
    const clientId = req.user!.userId;

    const quote = await QuoteRepository.create(clientId, {
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
      items,
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Comerciante - Obtener todas las cotizaciones
export const getMerchantQuotes = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as QuoteStatus | undefined;
    const quotes = await QuoteRepository.findMany(status);
    res.json(quotes);
  } catch (error) {
    console.error('Get merchant quotes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Comerciante - Detalle de cotización
export const getMerchantQuoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quote = await QuoteRepository.findById(id);

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Get merchant quote by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Comerciante - Responder con precio
export const respondToQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quotedPrice, merchantMessage } = req.body;
    const merchantId = req.user!.userId;

    const quote = await QuoteRepository.findById(id);
    if (!quote || (quote.status !== QuoteStatus.PENDING && quote.status !== QuoteStatus.UNFEASIBLE)) {
      return res.status(400).json({ error: 'Cotización no válida para ser respondida' });
    }

    const updated = await QuoteRepository.updateStatus(id, {
      status: QuoteStatus.QUOTED,
      changedBy: merchantId,
      note: 'Comerciante respondió con un precio',
      quotedPrice,
      merchantMessage,
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

    const quote = await QuoteRepository.findById(id);
    if (!quote || quote.clientId !== clientId || quote.status !== QuoteStatus.QUOTED) {
      return res.status(400).json({ error: 'Operación inválida' });
    }

    const updated = await QuoteRepository.updateStatus(id, {
      status: QuoteStatus.APPROVED,
      changedBy: clientId,
      note: 'Cliente aprobó la cotización',
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

    const merchant = await UserRepository.findById(merchantId);
    const whatsappUrl = `https://wa.me/${merchant?.whatsappNumber || ''}?text=${encodeURIComponent(
      `Hola, me contacto por la cotización #${id} en CoreMen. ¿Podemos explorar alternativas?`
    )}`;

    const quote = await QuoteRepository.findById(id);
    if (!quote || quote.status !== QuoteStatus.PENDING) {
      return res.status(400).json({ error: 'Cotización no válida para ser marcada como inviable' });
    }

    const updated = await QuoteRepository.updateStatus(id, {
      status: QuoteStatus.UNFEASIBLE,
      changedBy: merchantId,
      note: 'Marcado inviable por el comerciante',
      unfeasibleReason,
      whatsappUrl,
    });

    res.json(updated);
  } catch (error) {
    console.error('Unfeasible quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
