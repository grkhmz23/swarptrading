import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { type AuthContext, SessionService } from "./session.service.js";

/**
 * How much PIN assurance a route needs:
 * - `none`: any signed-in session, including one that has not entered the PIN yet.
 * - `unlocked` (default): the PIN was entered in this session within SESSION_UNLOCK_TTL_SECONDS.
 * - `recent`: the PIN was entered within PIN_STEP_UP_TTL_SECONDS — for value-moving actions.
 */
export type PinRequirement = "none" | "unlocked" | "recent";

const PIN_REQUIREMENT = "swarp:pin-requirement";

/** Allow sessions that have not entered the PIN yet (PIN set-up, unlock, profile basics). */
export const AllowPinPending = () => SetMetadata(PIN_REQUIREMENT, "none" satisfies PinRequirement);
/** Require a PIN entry within the step-up window. */
export const RequireRecentPin = () => SetMetadata(PIN_REQUIREMENT, "recent" satisfies PinRequirement);

type AuthedRequest = FastifyRequest & { auth?: AuthContext };

/** The authenticated session, set by SessionGuard. */
export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const auth = ctx.switchToHttp().getRequest<AuthedRequest>().auth;
  if (!auth) throw new Error("CurrentAuth used on a route without SessionGuard");
  return auth;
});

export const PIN_REQUIRED_ERROR = "PIN Required";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? "");
    const auth = match?.[1] ? await this.sessions.authenticate(match[1]) : null;
    if (!auth) throw new UnauthorizedException("Session expired. Please sign in again.");

    const requirement =
      this.reflector.getAllAndOverride<PinRequirement | undefined>(PIN_REQUIREMENT, [context.getHandler(), context.getClass()]) ??
      "unlocked";
    const pinAgeSeconds = auth.pinVerifiedAt ? (Date.now() - auth.pinVerifiedAt.getTime()) / 1000 : Infinity;
    if (requirement === "unlocked" && pinAgeSeconds > this.config.SESSION_UNLOCK_TTL_SECONDS) {
      throw new ForbiddenException({ message: "Enter your wallet PIN to continue.", error: PIN_REQUIRED_ERROR });
    }
    if (requirement === "recent" && pinAgeSeconds > this.config.PIN_STEP_UP_TTL_SECONDS) {
      throw new ForbiddenException({ message: "Confirm this action with your wallet PIN.", error: PIN_REQUIRED_ERROR });
    }

    request.auth = auth;
    return true;
  }
}
