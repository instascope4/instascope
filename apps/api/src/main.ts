import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import {writeFileSync} from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app: any = await NestFactory.create(AppModule,{ bufferLogs: true});

  app.useLogger(app.get(Logger));

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // S3.4: Sıkı ve eksiksiz Helmet Güvenlik Başlıkları
  // Geliştirme ortamında (localhost) Bull Board ve Swagger'ın rahat çalışması için
  const isDev = process.env.NODE_ENV !== 'production';

  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdnjs.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "validator.swagger.io"],
          fontSrc: ["'self'", "fonts.gstatic.com"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
    }),
  );
  // Permissions-Policy başlığını ekleyen ara katman (middleware)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
  

  app.useGlobalFilters(new ThrottlerExceptionFilter(), new AllExceptionsFilter());
  
  app.enableCors({
    origin: [
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
      'http://localhost:3000', 
      'http://localhost:3001',
      'http://127.0.01:3000',
      'https://blurb-demanding-protrude.ngrok-free.dev'
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, ngrok-skip-browser-warning',
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Instascope API')
    .setDescription('Instascope backend servis dokümantasyonu')
    .setVersion('1.0')
    .addTag('accounts')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // OpenAPI şemasını otomatik olarak openapi.json olarak kaydet
  const outputPath = join(process.cwd(), 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`OpenAPI şeması başarıyla kaydedildi: ${outputPath}`);

  SwaggerModule.setup('docs', app as any, document, {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
  });

  const port = process.env.PORT || 9000;
  await app.listen(port);
}
bootstrap();