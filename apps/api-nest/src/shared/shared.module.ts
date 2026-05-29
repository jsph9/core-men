import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [EmailService, PdfService, StorageService, AuditService],
  exports: [EmailService, PdfService, StorageService, AuditService],
})
export class SharedModule {}
