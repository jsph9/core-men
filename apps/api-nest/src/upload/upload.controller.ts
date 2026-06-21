import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { S3Service, StorageFolder } from './s3.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }
    const url = await this.s3Service.uploadFile(file, StorageFolder.DISENIO_CLIENTE);
    return {
      message: 'Logo subido exitosamente a S3',
      url,
    };
  }

  @Post('catalogo')
  @UseInterceptors(FilesInterceptor('files', 4))
  async uploadCatalog(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han proporcionado archivos');
    }
    const uploadPromises = files.map((file) =>
      this.s3Service.uploadFile(file, StorageFolder.CATALOGO),
    );
    const urls = await Promise.all(uploadPromises);
    return {
      message: 'Imágenes de catálogo subidas exitosamente a S3',
      urls,
    };
  }
}
