import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AddIncomeDto } from './income.validation';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
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
