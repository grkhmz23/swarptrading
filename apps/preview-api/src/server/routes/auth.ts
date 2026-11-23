import type { Router } from "../router";
import type { ApiResult } from "../types";
import { codeMatches, issueToken } from "../auth";
import { isSolanaAddress } from "../base58";
import { HttpError, disabled, str } from "../http";
import { LIMITS, previewState } from "../state";
import { REFERRAL_CODE, referrals, type NotificationPreferences } from "../data/account";
import { USER_ID, WALLET_ID } from "../data/wallet";

const PHONE = /^\+?[0-9][0-9 ()-]{5,19}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const USERNAME = /^[a-z0-9_]{3,20}$/i;
const RESERVED_USERNAMES = new Set(["admin", "swarp", "support", "swarppay", "root"]);

function login(body: Record<string, unknown>): string {
  const phone = str(body, "phoneNumber", { optional: true, max: 24 });
  const email = str(body, "email", { optional: true, max: 254 });
  if (phone) {
    if (!PHONE.test(phone)) throw new HttpError(400, "Enter a valid phone number.");
    return phone;
  }
  if (email) {
    if (!EMAIL.test(email)) throw new HttpError(400, "Enter a valid email address.");
    return email;
  }
  throw new HttpError(400, "phoneNumber is required.");
}

function userPayload(loginId: string, walletAddress: string) {
  const s = previewState();
  return {
    id: USER_ID,
    ...(loginId.includes("@") ? { email: loginId } : { phoneNumber: loginId }),
    firstName: s.profile.firstName,
    lastName: s.profile.lastName,
    isVerified: true,
    walletId: WALLET_ID,
    walletAddress,
  };
}

export function authRoutes(r: Router): void {
  r.post("/auth/continue-with-phone", async (ctx): Promise<ApiResult<"continueWithPhone">> => {
    login(await ctx.body());
    return {
      message: "Preview: enter the shared access code as your passcode.",
      isNewUser: false,
      requiresOnboarding: false,
      hasWalletPIN: true,
      userId: USER_ID,
      walletId: WALLET_ID,
      walletAddress: ctx.cfg.walletAddress,
    };
  });

  r.post("/auth/verify-otp", async (ctx): Promise<ApiResult<"verifyOtp">> => {
    const body = await ctx.body();
    const loginId = login(body);
    if (!codeMatches(str(body, "otp", { max: 12 }), ctx.cfg.accessCode)) {
      throw new HttpError(400, "Invalid or expired code.");
    }
    return { token: issueToken(ctx.cfg.jwtSecret, USER_ID, loginId), user: userPayload(loginId, ctx.cfg.walletAddress) };
  });

  r.post("/auth/login-with-passcode", async (ctx): Promise<ApiResult<"loginWithPasscode">> => {
    const body = await ctx.body();
    const loginId = login(body);
    if (!codeMatches(str(body, "passcode", { max: 12 }), ctx.cfg.accessCode)) {
      throw new HttpError(401, "Incorrect passcode.");
    }
    return { token: issueToken(ctx.cfg.jwtSecret, USER_ID, loginId), user: userPayload(loginId, ctx.cfg.walletAddress) };
  });

  r.get("/auth/google/callback", () => {
    throw new HttpError(501, "Google sign-in is not available in the preview. Use phone sign-in with the shared access code.");
  });

  r.post("/auth/verify-wallet-pin", async (ctx): Promise<ApiResult<"verifyWalletPIN">> => {
    ctx.session();
    if (!codeMatches(str(await ctx.body(), "pin", { max: 12 }), ctx.cfg.accessCode)) {
      throw new HttpError(401, "Incorrect PIN.");
    }
    return { message: "PIN verified", success: true };
  });

  r.get("/auth/has-wallet-pin", (ctx): ApiResult<"hasWalletPIN"> => {
    ctx.session();
    return { hasPIN: true };
  });

  r.post("/auth/set-wallet-pin", (ctx) => {
    ctx.session();
    throw new HttpError(409, "A wallet PIN is already set for this account.");
  });

  r.post("/auth/change-passcode", (ctx) => {
    ctx.session();
    disabled();
  });

  r.delete("/auth/delete-account", (ctx) => {
    ctx.session();
    disabled();
  });

  r.post("/auth/update-country", async (ctx): Promise<ApiResult<"updateCountry">> => {
    ctx.session();
    str(await ctx.body(), "country", { max: 80 });
    return { message: "Country saved" };
  });

  r.get("/auth/profile", (ctx): ApiResult<"getUserProfile"> => {
    const claims = ctx.session();
    const s = previewState();
    return {
      ...userPayload(claims.login, ctx.cfg.walletAddress),
      ...(s.profile.email ? { email: s.profile.email } : {}),
      username: s.username,
      kycStatus: "approved" as const,
    };
  });

  r.patch("/auth/me/profile", async (ctx): Promise<ApiResult<"updateUserProfile">> => {
    ctx.session();
    const body = await ctx.body();
    const firstName = str(body, "firstName", { max: 50 });
    const lastName = str(body, "lastName", { max: 50 });
    const email = str(body, "email", { optional: true, max: 254 });
    if (email && !EMAIL.test(email)) throw new HttpError(400, "Enter a valid email address.");
    previewState().profile = { firstName, lastName, email };
    return { firstName, lastName, email };
  });

  r.post("/auth/upload-profile-picture", (ctx) => {
    ctx.session();
    disabled();
  });

  r.get("/auth/profile-picture", (ctx): ApiResult<"getProfilePicture"> => {
    ctx.session();
    return { url: null };
  });

  r.post("/auth/check-email", async (ctx): Promise<ApiResult<"checkEmail">> => {
    const email = str(await ctx.body(), "email", { max: 254 });
    if (!EMAIL.test(email)) throw new HttpError(400, "Enter a valid email address.");
    return { exists: false, message: "Email is available" };
  });

  r.get("/auth/suggest-username", (ctx): ApiResult<"suggestUsernames"> => {
    ctx.session();
    const base = (ctx.url.searchParams.get("name") ?? "swarp").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 14) || "swarp";
    return { suggestions: [`${base}_sol`, `${base}${new Date().getFullYear()}`, `${base}_pay`, `the_${base}`].map((s) => s.slice(0, 20)) };
  });

  r.get("/auth/check-username", (ctx): ApiResult<"checkUsernameAvailability"> => {
    ctx.session();
    const username = (ctx.url.searchParams.get("username") ?? "").trim();
    if (!USERNAME.test(username)) {
      return { available: false, username, message: "Use 3-20 letters, numbers or underscores." };
    }
    const taken = RESERVED_USERNAMES.has(username.toLowerCase());
    return { available: !taken, username, message: taken ? "That username is taken." : "Username is available." };
  });

  r.put("/auth/username", async (ctx): Promise<ApiResult<"updateUsername">> => {
    ctx.session();
    const username = str(await ctx.body(), "username", { max: 20 });
    if (!USERNAME.test(username)) throw new HttpError(400, "Use 3-20 letters, numbers or underscores.");
    if (RESERVED_USERNAMES.has(username.toLowerCase())) throw new HttpError(409, "That username is taken.");
    previewState().username = username;
    return { message: "Username updated", username };
  });

  r.get("/auth/notification-preferences", (ctx): ApiResult<"getNotificationPreferences"> => {
    ctx.session();
    return previewState().preferences;
  });

  r.patch("/auth/notification-preferences", async (ctx): Promise<ApiResult<"updateNotificationPreferences">> => {
    ctx.session();
    const body = await ctx.body();
    const prefs = previewState().preferences;
    for (const key of Object.keys(prefs) as (keyof NotificationPreferences)[]) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== "boolean") throw new HttpError(400, `${key} must be true or false.`);
      prefs[key] = body[key] as boolean;
    }
    return { success: true, message: "Preferences saved", preferences: prefs };
  });

  r.patch("/auth/language", async (ctx): Promise<ApiResult<"updateLanguage">> => {
    ctx.session();
    const language = str(await ctx.body(), "language", { max: 40 });
    previewState().language = language;
    return { success: true, message: "Language saved", language };
  });

  r.post("/auth/generate-referral", (ctx): ApiResult<"generateReferral"> => {
    ctx.session();
    return { referralCode: REFERRAL_CODE };
  });

  r.post("/auth/apply-referral", (ctx) => {
    ctx.session();
    throw new HttpError(400, "Preview: referral codes can't be applied to the shared preview account.");
  });

  r.post("/auth/check-referral", async (ctx): Promise<ApiResult<"checkReferralCode">> => {
    const code = str(await ctx.body(), "referralCode", { max: 40 });
    const valid = code.toUpperCase() === REFERRAL_CODE;
    return { valid, message: valid ? "Referral code is valid." : "Referral code not found." };
  });

  r.get("/auth/my-referrals", (ctx): ApiResult<"getMyReferrals"> => {
    ctx.session();
    return referrals();
  });

  r.get("/auth/contacts", (ctx): ApiResult<"getUserContacts"> => {
    ctx.session();
    return { success: true, contacts: previewState().contacts };
  });

  r.post("/auth/contacts", async (ctx): Promise<ApiResult<"addUserContact">> => {
    ctx.session();
    const body = await ctx.body();
    const nickname = str(body, "nickname", { max: 40 });
    const address = str(body, "address", { max: 44 });
    if (!isSolanaAddress(address)) throw new HttpError(400, "Enter a valid Solana address.");
    const contacts = previewState().contacts;
    if (contacts.some((c) => c.address === address)) throw new HttpError(409, "This address is already in your address book.");
    if (contacts.length >= LIMITS.contacts) throw new HttpError(400, "Address book is full.");
    contacts.push({ nickname, address });
    return { success: true, message: "Contact added", contacts };
  });
}
