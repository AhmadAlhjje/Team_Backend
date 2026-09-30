export class HealthResponseDto {
  status!: 'ok';
  database!: 'up';
  uptimeSeconds!: number;
}
