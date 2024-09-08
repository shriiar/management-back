import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CompanyService } from './services/company.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response_message.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { USER_ROLE } from '../users/users.constant';
import { AddCompanyDto } from './company.validation';

@ApiTags('Company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {

	constructor(
		private companyService: CompanyService
	) { }

	@Post('add-company')
	// @UseGuards(RolesGuard)
	// @Roles(USER_ROLE.super_admin)
	@ApiBody({ type: AddCompanyDto })
	@ResponseMessage("Company added successfully")
	async addCompany(
		@Body() body: AddCompanyDto
	) {
		return await this.companyService.addCompany(body);
	}
}
