import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { CreateCategoryDto, CreateDestinationDto, UpdateCategoryDto, UpdateDestinationDto } from '../dto/category.dto.js';
import { Category } from '../entities/category.entity.js';
import { Destination } from '../entities/destination.entity.js';
import { TourDestination } from '../entities/tour-destination.entity.js';
import type { CategoryView } from '../types/catalog.types.js';

/** Danh mục tour + điểm đến – gộp chung vì cùng quyền `category:write` và cùng dạng CRUD. */
@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Destination) private readonly destinationRepo: Repository<Destination>,
    @InjectRepository(TourDestination) private readonly tourDestinationRepo: Repository<TourDestination>,
  ) { }

  // ===== danh mục =====

  async listCategories(): Promise<CategoryView[]> {
    const items = await this.categoryRepo.find({ order: { name: 'ASC' } });
    return items.map((item) => this.toView(item));
  }

  async getCategoryOrFail(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    return category;
  }

  async createCategory(dto: CreateCategoryDto): Promise<CategoryView> {
    await this.assertCategorySlugFree(dto.slug, null);
    const category = this.categoryRepo.create({ name: dto.name.trim(), slug: dto.slug.trim() });
    return this.toView(await this.categoryRepo.save(category));
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<CategoryView> {
    const category = await this.getCategoryOrFail(id);
    if (dto.slug !== undefined) await this.assertCategorySlugFree(dto.slug, id);
    if (dto.name !== undefined) category.name = dto.name.trim();
    if (dto.slug !== undefined) category.slug = dto.slug.trim();
    return this.toView(await this.categoryRepo.save(category));
  }

  /**
   * Xóa danh mục. Bảng nối `tour_categories` có khóa ngoại nên phải gỡ liên kết trước.
   * Dùng `delete` thẳng trên bảng nối để không phải nạp entity Tour (tránh xóa nhầm tour).
   */
  async removeCategory(id: string): Promise<void> {
    await this.getCategoryOrFail(id);
    await this.categoryRepo.manager.transaction(async (manager) => {
      await manager.query('DELETE FROM tour_categories WHERE category_id = ?', [id]);
      await manager.delete(Category, { id });
    });
  }

  async findCategoriesByIds(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    const found = await this.categoryRepo.find({ where: unique.map((id) => ({ id })) });
    if (found.length !== unique.length) {
      const missing = unique.filter((id) => !found.some((item) => item.id === id));
      throw new NotFoundException(`Không tìm thấy danh mục: ${missing.join(', ')}`);
    }
    return found;
  }

  // ===== điểm đến =====

  async listDestinations() {
    return this.destinationRepo.find({ order: { name: 'ASC' } });
  }

  async getDestinationOrFail(id: string): Promise<Destination> {
    const destination = await this.destinationRepo.findOne({ where: { id } });
    if (!destination) throw new NotFoundException('Không tìm thấy điểm đến');
    return destination;
  }

  async createDestination(dto: CreateDestinationDto): Promise<Destination> {
    await this.assertDestinationSlugFree(dto.slug, null);
    const destination = this.destinationRepo.create({
      name: dto.name.trim(),
      slug: dto.slug.trim(),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      description: dto.description?.trim() || null,
    });
    return this.destinationRepo.save(destination);
  }

  async updateDestination(id: string, dto: UpdateDestinationDto): Promise<Destination> {
    const destination = await this.getDestinationOrFail(id);
    if (dto.slug !== undefined) await this.assertDestinationSlugFree(dto.slug, id);
    if (dto.name !== undefined) destination.name = dto.name.trim();
    if (dto.slug !== undefined) destination.slug = dto.slug.trim();
    if (dto.latitude !== undefined) destination.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) destination.longitude = dto.longitude ?? null;
    if (dto.description !== undefined) destination.description = dto.description?.trim() || null;
    return this.destinationRepo.save(destination);
  }

  /**
   * Xóa điểm đến. `tour_destinations.destination_id` là FK `RESTRICT`, nên chặn khi
   * còn tour tham chiếu và báo rõ số tour đang dùng.
   */
  async removeDestination(id: string): Promise<void> {
    await this.getDestinationOrFail(id);
    const usedBy = await this.tourDestinationRepo.count({ where: { destinationId: id } });
    if (usedBy > 0) {
      throw new ConflictException(`Điểm đến đang được ${usedBy} tour sử dụng – hãy gỡ khỏi các tour đó trước`);
    }
    await this.destinationRepo.delete({ id });
  }

  async findDestinationsByIds(ids: string[]): Promise<Destination[]> {
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    const found = await this.destinationRepo.find({ where: unique.map((id) => ({ id })) });
    if (found.length !== unique.length) {
      const missing = unique.filter((id) => !found.some((item) => item.id === id));
      throw new NotFoundException(`Không tìm thấy điểm đến: ${missing.join(', ')}`);
    }
    return found;
  }

  // ===== nội bộ =====

  toView(category: Category): CategoryView {
    return { id: category.id, name: category.name, slug: category.slug };
  }

  private async assertCategorySlugFree(slug: string, exceptId: string | null): Promise<void> {
    const existing = await this.categoryRepo.findOne({ where: { slug: slug.trim() } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Slug "${slug}" đã được dùng cho danh mục khác`);
    }
  }

  private async assertDestinationSlugFree(slug: string, exceptId: string | null): Promise<void> {
    const existing = await this.destinationRepo.findOne({ where: { slug: slug.trim() } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Slug "${slug}" đã được dùng cho điểm đến khác`);
    }
  }
}
