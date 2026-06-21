import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export enum StorageFolder {
  CATALOGO = 'catalogo-coremen',
  DISENIO_CLIENTE = 'disenio-cliente',
  IMAGENES = 'imagenes-coremen',
}

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || 'amazon-s3-coremen-bucket';

    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    if (nodeEnv !== 'production') {
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
      const sessionToken = this.configService.get<string>('AWS_SESSION_TOKEN');

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('Faltan credenciales de AWS (AWS_ACCESS_KEY_ID o AWS_SECRET_ACCESS_KEY) en el entorno de desarrollo.');
      }

      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        },
      });
    } else {
      // In production, rely on IAM Role (Instance Profile) from EC2
      this.s3Client = new S3Client({
        region: this.region,
      });
    }
  }

  async uploadFile(file: Express.Multer.File, folder: StorageFolder): Promise<string> {
    try {
      const originalName = file.originalname;
      const extension = originalName.substring(originalName.lastIndexOf('.'));
      const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const key = `${folder}/${uniqueId}${extension}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al subir el archivo a S3: ${error.message}`,
      );
    }
  }
}
