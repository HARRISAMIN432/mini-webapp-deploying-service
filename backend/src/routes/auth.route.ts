import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authLimiter, otpLimiter } from "../middleware/rate-limit";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  verifyOtpSchema,
  totpVerifySchema,
  totpEnableSchema,
  totpDisableSchema,
} from "../validators/auth.validators";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  auth.register,
);

router.post(
  "/verify-email",
  otpLimiter,
  validate(verifyEmailSchema),
  auth.verifyEmail,
);

router.post(
  "/resend-verification",
  otpLimiter,
  validate(resendVerificationSchema),
  auth.resendVerification,
);

router.post("/login", authLimiter, validate(loginSchema), auth.login);

router.post(
  "/login/totp",
  authLimiter,
  validate(totpVerifySchema),
  auth.completeTotpLogin,
);

router.post(
  "/login/email-otp",
  authLimiter,
  validate(verifyOtpSchema),
  auth.completeEmailOtpLogin,
);

router.post("/refresh", auth.refresh);

router.post("/logout", authenticate, auth.logout);
router.post("/logout-all", authenticate, auth.logoutAll);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  auth.forgotPassword,
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  auth.resetPassword,
);

router.get("/oauth/:provider", auth.oauthRedirect);
router.get("/oauth/:provider/callback", auth.oauthCallback);

router.post("/totp/init", authenticate, auth.initTotp);
router.post(
  "/totp/confirm",
  authenticate,
  validate(totpEnableSchema),
  auth.confirmTotp,
);
router.post(
  "/totp/disable",
  authenticate,
  validate(totpDisableSchema),
  auth.disableTotp,
);

router.get("/me", authenticate, auth.getMe);

export default router;
