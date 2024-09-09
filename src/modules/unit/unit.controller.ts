import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { UnitService } from './services/unit.service';
import { RolesGuard } from 'src/guards/roles.guard';
import { USER_ROLE } from '../users/users.constant';
import { AddUnitDto } from './unit.validation';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseMessage } from 'src/common/decorators/response_message.decorator';
import { IFullUser } from '../users/users.interface';
import { CurrentUser } from 'src/common/decorators/user.decorator';

@ApiTags('Unit')
@Controller('unit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UnitController {

	constructor(
		private unitService: UnitService,
	) { }

	@Post('add-unit')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.admin, USER_ROLE.manager)
	@ApiBody({ type: AddUnitDto })
	@ResponseMessage("Unit added successfully")
	async addUnit(
		@Body() body: AddUnitDto,
		@CurrentUser() user: IFullUser
	) {
		return await this.unitService.addUnit(body, user);
	}
}
