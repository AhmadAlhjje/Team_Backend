import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class ReorderDto {
  /** IDs in the desired display order. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids!: number[];
}
