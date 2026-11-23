import { Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { OTP_PROVIDER } from "./otp/otp.provider.js";
import { OtpThrottleService } from "./otp/otp-throttle.service.js";
import { TwilioVerifyProvider } from "./otp/twilio-verify.provider.js";
import { PinService } from "./pin.service.js";
import { SessionGuard } from "./session.guard.js";
import { SessionService } from "./session.service.js";

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    SessionService,
    SessionGuard,
    PinService,
    OtpThrottleService,
    {
      provide: OTP_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new TwilioVerifyProvider(config),
    },
  ],
  // Later modules protect their routes with SessionGuard and step-up checks.
  exports: [SessionService, SessionGuard, PinService],
})
export class AuthModule {}
