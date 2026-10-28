import { validate } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { ProcessCancelDto } from './dto/booking.dto.js';

describe('Cancellation DTO whitelist regression', () => {
  it.each([true, false])('accepts JSON approve=%s through the production validation pipe', async approve => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
    const result = await pipe.transform({ approve, ...(approve ? {} : { rejectReason: 'Không đủ điều kiện' }) }, { type: 'body', metatype: ProcessCancelDto });
    expect(result.approve).toBe(approve);
  });
  it.each([true, false])('approve=%s is allowed by strict validation', async approve => {
    const dto = Object.assign(new ProcessCancelDto(), { approve });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
  it('rejects missing decision', async () => {
    expect((await validate(new ProcessCancelDto())).length).toBeGreaterThan(0);
  });
});