import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary from env variables automatically
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadDesignImage = async (fileBuffer: Buffer): Promise<string> => {
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
          reject(error || new Error('Upload failed'));
        } else {
          resolve(result.secure_url);
        }
      }
    ).end(fileBuffer);
  });
};
