import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ExpenseService } from './services/expense.service';
import { AddExpenseDto } from './expense.validation';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { IFullUser } from '../users/users.interface';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { USER_ROLE } from '../users/users.constant';

@ApiTags('Expense')
@Controller('expense')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ExpenseController {

	constructor(
		private readonly expenseService: ExpenseService
	) { }

	@Get('get-partial-expenses')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	@ApiQuery({ name: 'id', required: false })
	@ApiQuery({ name: 'month', required: false })
	@ApiQuery({ name: 'year', required: false })
	@ApiQuery({ name: 'sortBy', required: false })
	@ApiQuery({ name: 'sortOrder', required: false })
	async getPartialExpenses(
		@Query('page') page: number,
		@Query('limit') limit: number,
		@Query('id') id: string,
		@Query('month') month: number,
		@Query('year') year: number,
		@Query('sortBy') sortBy: string,
		@Query('sortOrder') sortOrder: number,
		@CurrentUser() user: IFullUser,
	) {
		let filter = {
			id, month, year, sortBy, sortOrder
		}
		return await this.expenseService.getPartialExpenses(page, limit, filter, user);
	}

	@ApiBody({ type: () => AddExpenseDto })
	@Post('add-expense')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager, USER_ROLE.accountant)
	async addExpense(
		@Body() body: AddExpenseDto,
		@CurrentUser() user: IFullUser
	) {
		return await this.expenseService.addExpense(body, user);
	}
}
