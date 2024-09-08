import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './mongoose-config.service';
import { getAllSchema } from 'src/common/database/getSchema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
    MongooseModule.forFeature(getAllSchema())
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
