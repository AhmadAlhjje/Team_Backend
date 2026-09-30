import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const toInt = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no', ''].includes(value.toLowerCase())) return false;
  return value;
};

const DURATION = /^\d+(ms|s|m|h|d)?$/;

/**
 * Every environment variable the backend reads. The app refuses to start when
 * a value is missing or invalid, instead of failing later at runtime.
 * Documented in .env.example.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @IsString()
  @Matches(/^mysql:\/\//, { message: 'DATABASE_URL must start with mysql://' })
  DATABASE_URL!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  DB_CONNECTION_LIMIT = 10;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @Matches(DURATION)
  JWT_EXPIRES_IN = '15m';

  @Matches(DURATION)
  REFRESH_TOKEN_EXPIRES_IN = '7d';

  /** Comma-separated list of allowed browser origins. */
  @IsString()
  CORS_ORIGINS = '';

  /**
   * Express "trust proxy" setting: false | true | number of hops | comma-separated IPs/subnets.
   * Required behind Nginx/load balancers so rate limiting sees the real client IP.
   */
  @IsString()
  TRUST_PROXY = 'false';

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;

  @IsString()
  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL = 'info';

  @IsIn(['local'])
  STORAGE_DRIVER = 'local';

  @IsString()
  STORAGE_LOCAL_DIR = 'uploads';

  /** Public base URL under which uploaded files are served. */
  @IsString()
  @Matches(/^https?:\/\//, { message: 'STORAGE_PUBLIC_URL must be an absolute http(s) URL' })
  STORAGE_PUBLIC_URL!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(50)
  UPLOAD_MAX_FILE_SIZE_MB = 5;

  /** Frontend on-demand revalidation endpoint (optional). */
  @IsOptional()
  @Matches(/^https?:\/\//)
  FRONTEND_REVALIDATE_URL?: string;

  @ValidateIf((env: EnvironmentVariables) => Boolean(env.FRONTEND_REVALIDATE_URL))
  @IsString()
  @MinLength(32, { message: 'REVALIDATE_SECRET must be at least 32 characters' })
  REVALIDATE_SECRET?: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS = 60;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 120;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  if (validated.NODE_ENV === NodeEnv.Production && validated.CORS_ORIGINS.split(',').includes('*')) {
    throw new Error('CORS_ORIGINS must list explicit origins in production (wildcard "*" is not allowed).');
  }

  return validated;
}
