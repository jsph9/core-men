import { Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule, CartModule, OrdersModule, QuotesModule, MerchantModule, AdminModule, SharedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
