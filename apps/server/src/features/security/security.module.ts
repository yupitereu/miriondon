import { Module } from '@nestjs/common';

import { RedisModule } from '../../infra/redis/redis.module';

import { SecurityController } from './security.controller';
import { UserSecurityService } from './user-security.service';

@Module({
  imports: [RedisModule],
  controllers: [SecurityController],
  providers: [UserSecurityService]
})
export class SecurityModule {}
