import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { jsonTransformer } from '../../common/transformers/money.transformer.js';

export interface SupportReply { authorId: string; authorName: string; message: string; createdAt: string }

@Entity('support_tickets')
@Index('idx_support_customer', ['customerId', 'createdAt'])
export class SupportTicket extends BaseEntity {
  @Column({ name: 'customer_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  customerId: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 150 })
  customerName: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

  @Column({ type: 'json', transformer: jsonTransformer })
  replies: SupportReply[];
}