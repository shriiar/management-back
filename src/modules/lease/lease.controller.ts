import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LeaseService } from './services/lease.service';
import { IFullUser } from '../users/users.interface';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { AddLeaseDto } from './lease.validation';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { USER_ROLE } from '../users/users.constant';

@ApiTags('Lease')
@Controller('lease')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class LeaseController {

	constructor(
		private readonly leaseService: LeaseService
	) { }

	@Post('add-lease')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	@ApiBody({ type: () => AddLeaseDto })
	async AddLease(
		@Body() body: AddLeaseDto,
		@CurrentUser() user: IFullUser,
	) {
		return await this.leaseService.addLease(body, user);
	}
}
