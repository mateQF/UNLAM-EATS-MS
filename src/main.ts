import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as bodyParser from 'body-parser';
import { Request } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    bodyParser.json({
      verify: (req: Request & { rawBody?: string }, _res, buf) => {
        req.rawBody = buf && buf.length ? buf.toString('utf8') : '';
      },
    }),
  );

  app.use(
    bodyParser.urlencoded({
      extended: true,
      verify: (req: Request & { rawBody?: string }, _res, buf) => {
        req.rawBody = buf && buf.length ? buf.toString('utf8') : '';
      },
    }),
  );

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('Payments API')
    .setDescription('API for managing payments with MercadoPago')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'idempotency-key',
        in: 'header',
        description: 'Idempotency key for safe retries',
      },
      'idempotency-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: configService.get<string>('APP_URL') || 'http://localhost:3001',
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const PORT = configService.get<number>('PORT') || 3000;
  await app.listen(PORT);
  console.log(`🚀 App running on http://localhost:${PORT}`);
  console.log(`📚 Swagger docs on http://localhost:${PORT}/api/docs`);
}

void bootstrap();
