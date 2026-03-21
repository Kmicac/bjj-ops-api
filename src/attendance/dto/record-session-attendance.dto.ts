import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { SessionAttendanceEntryDto } from './session-attendance-entry.dto';

export class RecordSessionAttendanceDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => SessionAttendanceEntryDto)
  records!: SessionAttendanceEntryDto[];
}
