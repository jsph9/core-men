import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [EmailService, PdfService, StorageService],
  exports: [EmailService, PdfService, StorageService],
})
export class SharedModule {}
