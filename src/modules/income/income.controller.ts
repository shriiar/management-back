import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AddIncomeDto } from './income.validation';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from 'src/guards/roles.guard';
import { USER_ROLE } from '../users/users.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { IFullUser } from '../users/users.interface';
import { IncomeService } from './services/income.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('Income')
@Controller('income')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class IncomeController {

	constructor(
		private readonly incomeService: IncomeService
	){}

	@Get('get-partial-incomes')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	@ApiQuery({ name: 'name', required: false })
	@ApiQuery({ name: 'email', required: false })
	@ApiQuery({ name: 'unitId', required: false })
	@ApiQuery({ name: 'propertyId', required: false })
	@ApiQuery({ name: 'month', required: false })
	@ApiQuery({ name: 'year', required: false })
	@ApiQuery({ name: 'sortBy', required: false })
	@ApiQuery({ name: 'sortOrder', required: false })
	async getPartialIncomes(
		@Query('page') page: number,
		@Query('limit') limit: number,
		@Query('name') name: string,
		@Query('email') email: string,
		@Query('unitId') unitId: string,
		@Query('propertyId') propertyId: string,
		@Query('month') month: number,
		@Query('year') year: number,
		@Query('sortBy') sortBy: string,
		@Query('sortOrder') sortOrder: number,
		@CurrentUser() user: IFullUser,
	) {
		let filter = {
			name, email, unitId, propertyId, month, year, sortBy, sortOrder
		}
		return await this.incomeService.getPartialIncomes(page, limit, filter, user);
	}

	@ApiBody({ type: () => AddIncomeDto })
	@Post('add-income')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.tenant)
	async addIncome(
		@Body() body: AddIncomeDto,
		@CurrentUser() user: IFullUser
	) {
		return await this.incomeService.addIncome(body, user);
	}
}
