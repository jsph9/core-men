import { Request, Response } from 'express';
import { uploadDesignImage } from '../services/storage.service';

export const uploadDesign = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // RNF-1: Validar formato (solo JPG/JPEG es permitido por Cloudinary logic)
    if (req.file.mimetype !== 'image/jpeg') {
      return res.status(400).json({ error: 'Solo se permiten archivos JPG/JPEG' });
    }

    const imageUrl = await uploadDesignImage(req.file.buffer);

    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload design error:', error);
    res.status(500).json({ error: 'Internal server error while uploading design' });
  }
};
