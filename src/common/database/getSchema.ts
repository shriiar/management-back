import { ModelDefinition } from "@nestjs/mongoose";
import { Company, CompanySchema } from "src/modules/company/company.model";
import { Property, PropertySchema } from "src/modules/property/property.model";
import { Unit, UnitSchema } from "src/modules/unit/unit.model";
import { User, UserSchema } from "src/modules/users/users.model";

const models = {
	'User': {
		name: User.name,
		schema: UserSchema,
	},

	'Company': {
		name: Company.name,
		schema: CompanySchema 
	},

	'Property': {
		name: Property.name,
		schema: PropertySchema 
	},

	'Unit': {
		name: Unit.name,
		schema: UnitSchema 
	}
}

export const getAllSchema = (): ModelDefinition[] => {
	return Object.keys(models).map(model => {
		return {
			name: models[model].name,
			schema: models[model].schema
		}
	})
}