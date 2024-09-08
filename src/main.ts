import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/exception-filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/response.interceptor';
import { EnvVariables } from './common/config/envConsts';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const conf = await app.resolve<ConfigService>(ConfigService);

	const prefix = conf.get(EnvVariables.APP_PREFIX, 'api');
	const port = process.env.PORT || conf.get(EnvVariables.APP_PORT, '3000');
	const host = conf.get(EnvVariables.APP_HOST, '0.0.0.0');
	const env = conf.get(EnvVariables.NODE_ENV, 'prod');

	app.useGlobalPipes(
		new ValidationPipe({
			exceptionFactory: (errors) => errors,
			stopAtFirstError: true,
			transform: true,
			// auto convert dto to instance
			transformOptions: {
				enableImplicitConversion: true,
			},
			//   skipUndefinedProperties: true,
			//    skipMissingProperties: true,
		}),
	);

	app.setGlobalPrefix(prefix);
	app.enableCors();

	// Swagger config remove in production
	if (env === 'stg' || env === 'dev') {
		const config = new DocumentBuilder()
			.setTitle('Property Management Web App API')
			.setVersion('1.0')
			.addBearerAuth()
			.build();
		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api', app, document);
	}

	// Apply the TransformInterceptor globally
	const reflector = app.get(Reflector);
	app.useGlobalInterceptors(new TransformInterceptor(reflector));

	// Handle all exceptions
	const httpAdapterHost = app.get(HttpAdapterHost);
	app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

	// process.env.PORT for heroku
	await app.listen(+port, host);
}
bootstrap();
