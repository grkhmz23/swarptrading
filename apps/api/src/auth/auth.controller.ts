import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { RouteConfig } from "@nestjs/platform-fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuditService } from "../audit/audit.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { requestMeta } from "../common/request-meta.js";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import type { User } from "../db/schema.js";
import { UsersService } from "../users/users.service.js";
import { OTP_PROVIDER, OtpDeliveryError, type OtpProvider } from "./otp/otp.provider.js";
import { OtpThrottleService } from "./otp/otp-throttle.service.js";
import { type NormalizedPhone, normalizePhone } from "./phone.js";
import { PinService } from "./pin.service.js";
import { AllowPinPending, CurrentAuth, SessionGuard } from "./session.guard.js";
import { type AuthContext, type IssuedTokens, SessionService } from "./session.service.js";

export const REFRESH_COOKIE = "swarp_rt";
const REFRESH_COOKIE_PATH = "/auth";

const phoneBody = z.object({ phoneNumber: z.string().min(1).max(32) });
const verifyOtpBody = z.object({
  phoneNumber: z.string().max(32).optional(),
  email: z.string().max(254).optional(),
  otp: z.string().regex(/^\d{4,10}$/, "must be the numeric code from the SMS"),
});
const pinBody = z.object({ pin: z.string().max(32) });
const changePinBody = z.object({ oldPasscode: z.string().max(32), newPasscode: z.string().max(32) });
const countryBody = z.object({
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "must be an ISO 3166-1 alpha-2 country code")
    .transform((code) => code.toUpperCase()),
});
const sessionIdParam = z.string().uuid("must be a session id");

const STRICT_LIMIT = { rateLimit: { max: 10, timeWindow: "1 minute" } };

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly pins: PinService,
    private readonly throttle: OtpThrottleService,
    private readonly audit: AuditService,
    @Inject(OTP_PROVIDER) private readonly otp: OtpProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Sends an SMS code. The response is identical for new and existing accounts
   * so it cannot be used to discover who has an account; the routing fields are
   * constants kept for the current dashboard, which then always asks for the code.
   */
  @Post("continue-with-phone")
  @HttpCode(HttpStatus.OK)
  @RouteConfig(STRICT_LIMIT)
  async continueWithPhone(@Body(new ZodPipe(phoneBody)) body: z.output<typeof phoneBody>, @Req() request: FastifyRequest) {
    const meta = requestMeta(request);
    const phone = this.requirePhone(body.phoneNumber);

    if (!(await this.throttle.reserve(phone.e164, meta.ip))) {
      await this.audit.record("otp.throttled", { meta, metadata: { country: phone.country } });
      throw new HttpException("Too many codes requested. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    try {
      await this.otp.send(phone.e164);
    } catch (error) {
      if (!(error instanceof OtpDeliveryError)) throw error;
      await this.audit.record("otp.send_failed", { meta, metadata: { reason: error.reason, country: phone.country } });
      throw this.deliveryException(error);
    }
    await this.audit.record("otp.sent", { meta, metadata: { country: phone.country } });
    return {
      message: "Verification code sent",
      otpSent: true,
      isNewUser: false,
      requiresOnboarding: true,
      hasWalletPIN: false,
    };
  }

  /** Checks the SMS code and signs in, creating the account on first use. The session starts PIN-pending. */
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @RouteConfig(STRICT_LIMIT)
  async verifyOtp(
    @Body(new ZodPipe(verifyOtpBody)) body: z.output<typeof verifyOtpBody>,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (!body.phoneNumber) throw new BadRequestException("Email sign-in is not available yet. Use your phone number.");
    const meta = requestMeta(request);
    const phone = this.requirePhone(body.phoneNumber);

    let result;
    try {
      result = await this.otp.check(phone.e164, body.otp);
    } catch (error) {
      if (!(error instanceof OtpDeliveryError)) throw error;
      this.logger.error(`OTP check failed: ${error.message}`);
      throw new BadGatewayException("Could not verify the code right now. Please try again.");
    }
    if (result !== "approved") {
      await this.audit.record("auth.otp_rejected", { meta, metadata: { result } });
      throw new UnauthorizedException(
        result === "expired" ? "This code has expired. Request a new one." : "Invalid code. Check the SMS and try again.",
      );
    }

    const { user, created } = await this.users.findOrCreateByPhone(phone.e164);
    if (user.status !== "active") throw new ForbiddenException("This account is disabled.");
    const tokens = await this.sessions.create(user.id, meta);
    this.setRefreshCookie(reply, tokens);
    await this.audit.record("auth.login", { userId: user.id, meta, metadata: { method: "phone_otp", newAccount: created } });
    return { token: tokens.accessToken, user: this.userPayload(user) };
  }

  /** Exchanges the httpOnly refresh cookie for a new access token, rotating the cookie. */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @RouteConfig(STRICT_LIMIT)
  async refresh(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const presented = request.cookies[REFRESH_COOKIE];
    if (!presented) throw new UnauthorizedException("Session expired. Please sign in again.");
    const result = await this.sessions.refresh(presented);
    if (!result) {
      this.clearRefreshCookie(reply);
      throw new UnauthorizedException("Session expired. Please sign in again.");
    }
    this.setRefreshCookie(reply, result);
    await this.audit.record("auth.refresh", { userId: result.userId, meta: requestMeta(request) });
    return { token: result.accessToken };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @AllowPinPending()
  async logout(@CurrentAuth() auth: AuthContext, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.sessions.revoke(auth.sessionId, auth.userId);
    this.clearRefreshCookie(reply);
    await this.audit.record("auth.logout", { userId: auth.userId, meta: requestMeta(request) });
    return { message: "Signed out" };
  }

  @Get("has-wallet-pin")
  @UseGuards(SessionGuard)
  @AllowPinPending()
  async hasWalletPin(@CurrentAuth() auth: AuthContext) {
    return { hasPIN: await this.pins.hasPin(auth.userId) };
  }

  @Post("set-wallet-pin")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @AllowPinPending()
  async setWalletPin(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodPipe(pinBody)) body: z.output<typeof pinBody>,
    @Req() request: FastifyRequest,
  ) {
    await this.pins.setInitial(auth.userId, body.pin);
    await this.sessions.markPinVerified(auth.sessionId);
    await this.audit.record("pin.set", { userId: auth.userId, meta: requestMeta(request) });
    return { message: "Wallet PIN set", success: true };
  }

  /** Unlocks the session; also the step-up check the dashboard runs before each value-moving action. */
  @Post("verify-wallet-pin")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @AllowPinPending()
  @RouteConfig({ rateLimit: { max: 20, timeWindow: "1 minute" } })
  async verifyWalletPin(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodPipe(pinBody)) body: z.output<typeof pinBody>,
    @Req() request: FastifyRequest,
  ) {
    const meta = requestMeta(request);
    const result = await this.pins.check(auth.userId, body.pin);
    if (result.outcome !== "ok") {
      await this.recordPinFailure(auth.userId, meta, result);
      PinService.throwFor(result);
    }
    await this.sessions.markPinVerified(auth.sessionId);
    await this.audit.record("pin.verified", { userId: auth.userId, meta });
    return { message: "PIN verified", success: true };
  }

  /** Changes the PIN (old PIN required) and signs out every other device. */
  @Post("change-passcode")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @AllowPinPending()
  async changePasscode(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodPipe(changePinBody)) body: z.output<typeof changePinBody>,
    @Req() request: FastifyRequest,
  ) {
    const meta = requestMeta(request);
    const result = await this.pins.check(auth.userId, body.oldPasscode);
    if (result.outcome !== "ok") {
      await this.recordPinFailure(auth.userId, meta, result);
      PinService.throwFor(result);
    }
    if (body.newPasscode === body.oldPasscode) throw new BadRequestException("The new PIN must be different from the current one");
    await this.pins.replace(auth.userId, body.newPasscode);
    await this.sessions.markPinVerified(auth.sessionId);
    const signedOut = await this.sessions.revokeOthers(auth.userId, auth.sessionId);
    await this.audit.record("pin.changed", { userId: auth.userId, meta, metadata: { otherSessionsRevoked: signedOut } });
    return { message: "PIN changed. Other devices were signed out." };
  }

  @Get("profile")
  @UseGuards(SessionGuard)
  @AllowPinPending()
  async profile(@CurrentAuth() auth: AuthContext) {
    const user = await this.users.findById(auth.userId);
    if (!user) throw new UnauthorizedException("Session expired. Please sign in again.");
    return { ...this.userPayload(user), kycStatus: "not_started" as const, country: user.country };
  }

  /** Saves citizenship for the signed-in user. Any phone/email in the body is ignored: identity comes from the token. */
  @Post("update-country")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @AllowPinPending()
  async updateCountry(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodPipe(countryBody)) body: z.output<typeof countryBody>,
    @Req() request: FastifyRequest,
  ) {
    await this.users.updateCountry(auth.userId, body.country);
    await this.audit.record("profile.country_updated", { userId: auth.userId, meta: requestMeta(request), metadata: { country: body.country } });
    return { message: "Country saved" };
  }

  /** Devices signed in to this account. Needs an unlocked session. */
  @Get("sessions")
  @UseGuards(SessionGuard)
  async listSessions(@CurrentAuth() auth: AuthContext) {
    return { sessions: await this.sessions.listActive(auth.userId, auth.sessionId) };
  }

  @Delete("sessions/:id")
  @UseGuards(SessionGuard)
  async revokeSession(@CurrentAuth() auth: AuthContext, @Param("id", new ZodPipe(sessionIdParam)) id: string, @Req() request: FastifyRequest) {
    if (!(await this.sessions.revoke(id, auth.userId))) throw new NotFoundException("Session not found");
    await this.audit.record("session.revoked", { userId: auth.userId, meta: requestMeta(request), metadata: { current: id === auth.sessionId } });
    return { message: "Session signed out" };
  }

  private requirePhone(input: string): NormalizedPhone {
    const phone = normalizePhone(input);
    if (!phone) throw new BadRequestException("Enter a valid phone number in international format, e.g. +14155550123.");
    const allowed = this.config.OTP_ALLOWED_COUNTRIES;
    if (allowed.length > 0 && (!phone.country || !allowed.includes(phone.country))) {
      throw new BadRequestException("SMS sign-in is not available for this country yet.");
    }
    return phone;
  }

  private deliveryException(error: OtpDeliveryError): HttpException {
    switch (error.reason) {
      case "invalid_number":
      case "blocked":
        return new BadRequestException(error.message);
      case "rate_limited":
        return new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      case "unavailable":
        this.logger.error(`OTP send failed: ${error.message}`);
        return new BadGatewayException("Failed to send SMS. Please try again shortly.");
    }
  }

  private async recordPinFailure(
    userId: string,
    meta: ReturnType<typeof requestMeta>,
    result: Exclude<Awaited<ReturnType<PinService["check"]>>, { outcome: "ok" }>,
  ): Promise<void> {
    if (result.outcome === "locked" && result.newlyLocked) {
      await this.audit.record("pin.locked", { userId, meta, metadata: { lockSeconds: result.retryAfterSeconds } });
    } else if (result.outcome === "wrong") {
      await this.audit.record("pin.failed", { userId, meta, metadata: { attemptsLeft: result.attemptsLeft } });
    }
  }

  private userPayload(user: User) {
    return {
      id: user.id,
      phoneNumber: user.phoneE164 ?? undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: true,
    };
  }

  private setRefreshCookie(reply: FastifyReply, tokens: IssuedTokens): void {
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: "strict",
      path: REFRESH_COOKIE_PATH,
      domain: this.config.COOKIE_DOMAIN,
      expires: tokens.refreshExpiresAt,
    });
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, domain: this.config.COOKIE_DOMAIN });
  }
}
