import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { UpsertSystemSettingDto } from './dto/system.dto.js';
import { SystemSetting } from './entities/system-setting.entity.js';
import type { SystemSettingView } from './types/system.types.js';

/**
 * Cấu hình động của hệ thống (key/value JSON).
 *
 * Khóa chính là `key` (không uuid). Các module khác đọc qua helper có kiểu
 * (`getNumber`/`getBoolean`/`getString`) để tránh `any` lan rộng.
 */
@Injectable()
export class SystemSettingService {
  private readonly logger = new Logger(SystemSettingService.name);

  constructor(
    @InjectRepository(SystemSetting) private readonly settingRepo: Repository<SystemSetting>,
  ) { }

  // ===== truy vấn =====

  async list(): Promise<SystemSettingView[]> {
    const settings = await this.settingRepo.find({ order: { key: 'ASC' } });
    return settings.map((setting) => this.toView(setting));
  }

  async get(key: string): Promise<SystemSettingView | null> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    return setting ? this.toView(setting) : null;
  }

  async getOrFail(key: string): Promise<SystemSetting> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Không tìm thấy cấu hình "${key}"`);
    return setting;
  }

  // ===== helper có kiểu (dùng nội bộ từ module khác) =====

  /** Đọc giá trị số; trả `fallback` nếu không có hoặc không phải số hợp lệ. */
  async getNumber(key: string, fallback: number): Promise<number> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    const value = setting?.value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
    return fallback;
  }

  /** Đọc giá trị boolean; trả `fallback` nếu không có hoặc không phải boolean. */
  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    const value = setting?.value;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  /** Đọc giá trị chuỗi; trả `fallback` nếu không có hoặc không phải chuỗi. */
  async getString(key: string, fallback: string): Promise<string> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    const value = setting?.value;
    return typeof value === 'string' ? value : fallback;
  }

  // ===== ghi =====

  /** Tạo mới hoặc cập nhật cấu hình theo `key`. */
  async upsert(dto: UpsertSystemSettingDto): Promise<SystemSettingView> {
    const key = dto.key.trim();
    const existing = await this.settingRepo.findOne({ where: { key } });

    if (existing) {
      existing.value = dto.value;
      if (dto.description !== undefined) existing.description = dto.description?.trim() ?? null;
      return this.toView(await this.settingRepo.save(existing));
    }

    const setting = await this.settingRepo.save(
      this.settingRepo.create({
        key,
        value: dto.value,
        description: dto.description?.trim() ?? null,
      }),
    );

    this.logger.log(`Tạo cấu hình ${setting.key}`);
    return this.toView(setting);
  }

  async remove(key: string): Promise<void> {
    const setting = await this.getOrFail(key);
    await this.settingRepo.remove(setting);
    this.logger.log(`Xóa cấu hình ${setting.key}`);
  }

  // ===== nội bộ =====

  private toView(setting: SystemSetting): SystemSettingView {
    return {
      key: setting.key,
      value: setting.value,
      description: setting.description ?? null,
    };
  }
}