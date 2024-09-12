import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LeaseService } from './services/lease.service';
import { IFullUser } from '../users/users.interface';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { AddLeaseDto, RenewLeaseDto } from './lease.validation';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { USER_ROLE } from '../users/users.constant';
import { ValidateMongoId } from 'src/common/exception-filters/mongodbId.filters';

@ApiTags('Lease')
@Controller('lease')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class LeaseController {

	constructor(
		private readonly leaseService: LeaseService
	) { }

	@Get('partial-tenants')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	@ApiQuery({ name: 'propertyId', required: false })
	@ApiQuery({ name: 'unitId', required: false })
	@ApiQuery({ name: 'name', required: false })
	@ApiQuery({ name: 'email', required: false })
	@ApiQuery({ name: 'fromStart', required: false })
	@ApiQuery({ name: 'toStart', required: false })
	@ApiQuery({ name: 'fromEnd', required: false })
	@ApiQuery({ name: 'toEnd', required: false })
	@ApiQuery({ name: 'isFutureLease', required: false })
	@ApiQuery({ name: 'sortBy', required: false })
	@ApiQuery({ name: 'sortOrder', required: false })
	async getLeases(
		@Query('page') pageNumber: number,
		@Query('limit') rowsPerPage: number,
		@Query('propertyId') propertyId: string,
		@Query('unitId') unitId: string,
		@Query('name') name: string,
		@Query('email') email: string,
		@Query('fromStart') fromStart: string,
		@Query('toStart') toStart: string,
		@Query('fromEnd') fromEnd: string,
		@Query('toEnd') toEnd: string,
		@Query('isFutureLease') isFutureLease: boolean,
		@Query('sortBy') sortBy: string,
		@Query('sortOrder') sortOrder: number,
		@CurrentUser() user: IFullUser,
	) {
		let filter = {
			propertyId, unitId, name, email, isFutureLease, fromStart, toStart, fromEnd, toEnd, sortBy, sortOrder
		}
		return await this.leaseService.getLeases(pageNumber, rowsPerPage, filter, user);
	}

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

	@Put('start-lease/:leaseId')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	async startLease(
		@Param('leaseId', ValidateMongoId) leaseId: string,
		@CurrentUser() user: IFullUser
	) {
		return await this.leaseService.startLease(leaseId, user);
	}

	@ApiBody({ type: () => RenewLeaseDto })
	@Put('renew-lease')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	async renewLease(
		@Body() body: RenewLeaseDto,
		@CurrentUser() user: IFullUser
	) {
		return await this.leaseService.renewLease(body, user);
	}

	@Put('end-lease/:leaseId')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	async endLease(
		@Param('leaseId', ValidateMongoId) leaseId: string,
		@CurrentUser() user: IFullUser
	) {
		return await this.leaseService.endLease(leaseId, user)
	}

	@Put('cancel-move-in/:leaseId')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.manager)
	async cancelMoveIn(
		@Param('leaseId', ValidateMongoId) leaseId: string,
		@CurrentUser() user: IFullUser
	) {
		return await this.leaseService.cancelMoveIn(leaseId, user)
	}
}
