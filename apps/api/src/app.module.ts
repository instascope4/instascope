import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { CollectorModule } from './collector/collector.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    BullModule.forRoot({
      // REDIS_URL (docker: redis://redis:6379) — yoksa localhost
      connection: (() => {
        const u = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
        return {
          host: u.hostname,
          port: Number(u.port) || 6379,
          password: u.password || undefined,
        };
      })(),
    }),

    // Sadece genel default limiti bırakıyoruz
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: process.env.LOAD_TEST === 'true' ? 100000 : 100,
      },
    ]),
    
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      },
    }),

    AuthModule,
    AccountsModule,
    CollectorModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}