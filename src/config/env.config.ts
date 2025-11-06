import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TTL: Joi.number().default(300),

  MERCADOPAGO_ACCESS_TOKEN: Joi.string().required(),
  MERCADOPAGO_PUBLIC_KEY: Joi.string().allow('').optional(),
  MERCADOPAGO_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),

  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  SWAGGER_PATH: Joi.string().default('/api/docs'),
}).unknown(true);
