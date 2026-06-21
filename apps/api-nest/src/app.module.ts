import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { QuotesModule } from './quotes/quotes.module';
import { MerchantModule } from './merchant/merchant.module';
import { AdminModule } from './admin/admin.module';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './users/users.module';
import { CustomizationModule } from './customization/customization.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule, 
    AuthModule, 
    ProductsModule, 
    CartModule, 
    OrdersModule, 
    QuotesModule, 
    MerchantModule, 
    AdminModule, 
    SharedModule,
    UsersModule,
    CustomizationModule,
    WebhooksModule,
    UploadModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
