import { EnvVariables } from "./envConsts";

export default <() => Record<EnvVariables, string | number>>(() => ({
	NODE_ENV: process.env.NODE_ENV,
	PORT: Number(process.env.PORT) || 3000,
	APP_PREFIX: process.env.APP_PREFIX,
	APP_PORT: Number(process.env.APP_PORT) || 3000,
	APP_HOST: process.env.APP_HOST,

	DATABASE_HOST: process.env.DATABASE_HOST,
	DATABASE_NAME: process.env.DATABASE_NAME,

    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
	JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
	JWT_FORGOT_PASSWORD_EXPIRES_IN: process.env.JWT_FORGOT_PASSWORD_EXPIRES_IN,

	BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
}));