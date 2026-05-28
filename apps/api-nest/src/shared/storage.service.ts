import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadDesignImage(fileBuffer: Buffer): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          folder: 'coremen/designs', 
          resource_type: 'image', 
          format: 'jpg',
          allowed_formats: ['jpg', 'jpeg']
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Upload failed', error);
            reject(error || new Error('Upload failed'));
          } else {
            resolve(result.secure_url);
          }
        }
      ).end(fileBuffer);
    });
  }
}

