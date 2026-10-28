import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupportDto {
  @IsString() @MinLength(3) @MaxLength(200) subject: string;
  @IsString() @MinLength(10) @MaxLength(4000) message: string;
}
export class ReplySupportDto {
  @IsString() @MinLength(1) @MaxLength(4000) message: string;
}
export class SupportStatusDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED']) status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}
export class QuerySupportDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}