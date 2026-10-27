import { BeforeInsert, Column, Entity, Index } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';

/**
 * `email_templates` – mẫu email (Handlebars), vd `BOOKING_CONFIRMED`.
 * `body_html` là `longtext` để chứa template dài (MySQL `text` chỉ 64KB).
 */
@Entity('email_templates')
@Index('uq_email_templates_code', ['code'], { unique: true })
export class EmailTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 60 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ name: 'body_html', type: 'longtext' })
  bodyHtml: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}