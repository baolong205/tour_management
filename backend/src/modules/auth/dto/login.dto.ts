import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'nguyenvana@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(191)
  email: string;

  @ApiProperty({ example: 'Abcd@1234' })
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(72)
  password: string;
}
