import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ProspectService } from './services/prospect.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { IFullUser } from '../users/users.interface';
import { AddProspectDto } from './prospect.validation';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { USER_ROLE } from '../users/users.constant';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Prospect')
@Controller('prospect')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProspectController {

	constructor(
		private readonly prospectService: ProspectService
	) { }

	@ApiBody({ type: () => AddProspectDto })
	@Post('add-prospect')
	@Roles(USER_ROLE.manager)
	@UseGuards(RolesGuard)
	async addProspect(
		@Body() body: AddProspectDto,
		@CurrentUser() user: IFullUser,
	) {
		return await this.prospectService.addProspect(body, user);
	}
}
