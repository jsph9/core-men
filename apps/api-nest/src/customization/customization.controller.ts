import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../shared/storage.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('customization')
@UseGuards(RolesGuard)
export class CustomizationController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Roles(Role.CLIENT)
  @UseInterceptors(FileInterceptor('designImage'))
  async uploadDesign(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    if (file.mimetype !== 'image/jpeg') {
      throw new BadRequestException('Solo se permiten archivos JPG/JPEG');
    }

    const imageUrl = await this.storageService.uploadDesignImage(file.buffer);
    return { imageUrl };
  }
}
