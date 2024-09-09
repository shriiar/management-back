import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { USER_ROLE } from '../users/users.constant';
import { AddPropertyDto } from './property.validation';
import { ResponseMessage } from 'src/common/decorators/response_message.decorator';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PropertyService } from './services/property.service';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { IFullUser } from '../users/users.interface';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('Property')
@Controller('property')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PropertyController {

	constructor(
		private propertyService: PropertyService,
	) { }

	@Get('get-partial-properties')
	@ApiQuery({ name: 'name', required: false })
	@ApiQuery({ name: 'address', required: false })
	@ApiQuery({ name: 'unitsCount', required: false })
	@ApiQuery({ name: 'occupiedUnits', required: false })
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.accountant)
	async getPartialProperties(
		@Query('name') name: string,
		@Query('address') address: string,
		@Query('unitsCount') unitsCount: number,
		@Query('occupiedUnits') occupiedUnits: number,
		@CurrentUser() user: IFullUser
	) {

		const filter = { name, address, unitsCount, occupiedUnits }

		return await this.propertyService.getPartialProperties(filter, user);
	}

	@Post('add-property')
	@UseGuards(RolesGuard)
	@Roles(USER_ROLE.admin, USER_ROLE.manager)
	@ApiBody({ type: AddPropertyDto })
	@ResponseMessage("Property added successfully")
	async addCompany(
		@Body() body: AddPropertyDto,
		@CurrentUser() user: IFullUser
	) {
		return await this.propertyService.addProperty(body, user);
	}
}
