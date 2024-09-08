import { Injectable } from '@nestjs/common';
import { AddCompanyDto } from '../company.validation';

@Injectable()
export class CompanyService {

	constructor(

	) { }

	async addCompany(payload: AddCompanyDto) {
		console.log(payload);
	}
}
