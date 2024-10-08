import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { IFullUser } from '../users/users.interface';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './services/reports.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { USER_ROLE } from '../users/users.constant';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ReportsController {

	constructor(
		private readonly reportsService: ReportsService
	) { }

	@Get('vacancy')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.accountant)
	@ApiQuery({ name: 'propertyId', required: false })
	async getVacancyReport(
		@Query('propertyId') propertyId: string,
		@Query('isOccupied') isOccupied: boolean,
		@CurrentUser() user: IFullUser
	) {

		const res = await this.reportsService.getVacancyReport({
			propertyId, isOccupied
		}, user)
		return res

	}

	@Get('rent')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.accountant)
	@ApiQuery({ name: 'propertyId', required: false })
	@ApiQuery({ name: 'from', required: false })
	@ApiQuery({ name: 'to', required: false })
	async getRentRollV3(
		@Query('propertyId') propertyId: string,
		@Query('from') from: string,
		@Query('to') to: string,
		@CurrentUser() user: IFullUser,
	) {
		const filter = { propertyId, from, to };

		return await this.reportsService.getRentReport(filter, user)
	}
}
