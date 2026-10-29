import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Env } from '../config/env.validation.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { authCookieOptionsFromConfig } from './config/cookie.config.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { clearAuthCookies, getRefreshToken, setAuthCookies } from './helpers/auth-cookies.js';
import type { AuthCookieOptions } from './interfaces/auth-cookie-options.interface.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';
import { Public } from './public.decorator.js';

@ApiTags('auth')
@Controller('auth')
// Rate limiting only here for now (per client IP; main.ts trusts the local proxy's X-Forwarded-For).
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly cookieOptions: AuthCookieOptions;

  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    config: ConfigService<Env, true>,
  ) {
    this.cookieOptions = authCookieOptionsFromConfig(config);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'Sets access_token and refresh_token cookies',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'More than 5 attempts per minute' })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.auth.login(dto.email, dto.password, userAgent);
    setAuthCookies(res, tokens, this.cookieOptions);
    return UserResponseDto.from(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiNoContentResponse({ description: 'Rotates the refresh token and issues a new access token' })
  @ApiUnauthorizedResponse({ description: 'Missing, expired or revoked refresh token' })
  async refresh(
    @Req() req: Request,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = getRefreshToken(req);
    if (!token) throw new UnauthorizedException();
    try {
      setAuthCookies(res, await this.auth.refresh(token, userAgent), this.cookieOptions);
    } catch (error) {
      // A dead refresh token is useless to the client: drop both cookies.
      clearAuthCookies(res, this.cookieOptions.secure);
      throw error;
    }
  }

  // Public: identified by the refresh cookie, so logout works even with an expired access token.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Revokes the current session and clears cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = getRefreshToken(req);
    if (token) await this.auth.logout(token);
    clearAuthCookies(res, this.cookieOptions.secure);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse()
  async me(@CurrentUser() current: AuthUser): Promise<UserResponseDto> {
    const user = await this.users.findById(current.id);
    // Token still valid, but the user was deleted or deactivated since.
    if (!user || !user.isActive) throw new UnauthorizedException();
    return UserResponseDto.from(user);
  }
}
