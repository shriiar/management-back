import { ModelDefinition } from "@nestjs/mongoose";
import { Company, CompanySchema } from "src/modules/company/company.model";
import { Expense, ExpenseSchema } from "src/modules/expense/expense.model";
import { Ledger, LedgerSchema } from "src/modules/lease/lease-ledger.model";
import { Rent, RentSchema } from "src/modules/lease/lease-rent.model";
import { Lease, LeaseSchema } from "src/modules/lease/lease.model";
import { Property, PropertySchema } from "src/modules/property/property.model";
import { Prospect, ProspectSchema } from "src/modules/prospect/prospect.model";
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
	},

	'Prospect': {
		name: Prospect.name,
		schema: ProspectSchema
	},

	'Lease': {
		name: Lease.name,
		schema: LeaseSchema
	},

	'Rent': {
		name: Rent.name,
		schema: RentSchema
	},

	'Ledger': {
		name: Ledger.name,
		schema: LedgerSchema
	},

	'Expense': {
		name: Expense.name,
		schema: ExpenseSchema
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