import { ModelDefinition } from "@nestjs/mongoose";
import { User, UserSchema } from "src/modules/users/users.model";

const models = {
	'User': {
		name: User.name,
		schema: UserSchema,
	},
}

export const getAllSchema = (): ModelDefinition[] => {
	return Object.keys(models).map(model => {
		return {
			name: models[model].name,
			schema: models[model].schema
		}
	})
}