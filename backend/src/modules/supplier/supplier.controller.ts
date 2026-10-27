import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { CreateSupplierDto, QuerySuppliersDto, UpdateSupplierDto } from './dto/supplier.dto.js';
import { SupplierService } from './supplier.service.js';

/**
 * Nhà cung cấp.
 *
 * Toàn bộ endpoint yêu cầu `supplier:manage` (STAFF/ADMIN) – dữ liệu nội bộ vận hành.
 */
@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) { }

  @Get()
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Danh sách nhà cung cấp (phân trang + lọc)' })
  list(@Query() query: QuerySuppliersDto) {
    return this.supplierService.paginate(query);
  }

  @Get(':id')
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Chi tiết nhà cung cấp' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.supplierService.getById(id);
  }

  @Post()
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Tạo nhà cung cấp' })
  create(@Body() dto: CreateSupplierDto) {
    return this.supplierService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSupplierDto) {
    return this.supplierService.update(id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Bật / tắt nhà cung cấp' })
  setActive(@Param('id', new ParseUUIDPipe()) id: string, @Query('active', ParseBoolPipe) active: boolean) {
    return this.supplierService.setActive(id, active);
  }

  @Delete(':id')
  @RequirePermissions('supplier:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mềm nhà cung cấp (chặn nếu còn phân bổ nguồn lực)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.supplierService.remove(id);
  }
}