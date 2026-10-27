import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'change_me',
  expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change_me_refresh',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
