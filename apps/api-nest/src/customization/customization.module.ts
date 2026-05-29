import { Module } from '@nestjs/common';
import { CustomizationController } from './customization.controller';

@Module({
  controllers: [CustomizationController],
})
export class CustomizationModule {}
