import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RoleName, UserStatus } from '../../../common/enums/index.js';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;
}

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: [UserStatus.ACTIVE, UserStatus.LOCKED, UserStatus.PENDING_VERIFY] })
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class AssignRolesDto {
  @ApiPropertyOptional({ enum: RoleName, isArray: true, example: [RoleName.STAFF] })
  @IsArray()
  @IsEnum(RoleName, { each: true })
  roles: RoleName[];
}

export class QueryUsersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Tìm theo email hoặc họ tên' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
