import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(@Query() filters: GetProductsDto) {
    return this.productsService.getProducts(filters);
  }

  @Get(':id')
  async getProductDetails(@Param('id') id: string) {
    return this.productsService.getProductDetails(id);
  }
}

