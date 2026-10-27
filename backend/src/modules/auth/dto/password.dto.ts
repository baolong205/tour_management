import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from './register.dto.js';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'nguyenvana@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(191)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token nhận qua email đặt lại mật khẩu' })
  @IsString()
  @MinLength(16)
  token: string;

  @ApiProperty({ example: 'Abcd@1234' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'Abcd@1234' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token xác thực email' })
  @IsString()
  @MinLength(16)
  token: string;
}
