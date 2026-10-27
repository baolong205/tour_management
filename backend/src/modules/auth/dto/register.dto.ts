import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_MESSAGE = 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số';

/** Đăng ký tài khoản khách hàng (email + mật khẩu). */
export class RegisterDto {
  @ApiProperty({ example: 'nguyenvana@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(191)
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A', maxLength: 150 })
  @IsString()
  @MinLength(2, { message: 'Họ tên tối thiểu 2 ký tự' })
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: 'Abcd@1234', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @Matches(/^[0-9+\-\s]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}
