import { z } from "zod";
import { EMAIL_REQUIREMENTS, PASSWORD_REQUIREMENTS, isValidEmail, isValidNewPassword } from "@/lib/auth/credential-policy";

/**
 * STRICT Name Validator:
 * Allows only alphabets and spaces, 2 to 50 characters in length.
 * Rejects numbers, symbols, and special characters.
 */
export const nameValidator = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must not exceed 50 characters")
  .regex(/^[a-zA-Z\s]{2,50}$/, "Name must only contain alphabetic characters and spaces (2-50 chars)");

/**
 * RFC compliant email format, trimmed and lowercased.
 */
export const emailValidator = z.string().trim().toLowerCase().refine(isValidEmail, EMAIL_REQUIREMENTS);

/**
 * Enterprise Password Validator:
 * Existing policy: 7–128 characters, uppercase letter, number and special character.
 */
export const passwordValidator = z.string().refine(isValidNewPassword, PASSWORD_REQUIREMENTS);

/**
 * Exactly 6 digits numeric OTP validator.
 */
export const otpValidator = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, "Verification code must be exactly 6 numeric digits");

/**
 * Allowed user roles for enterprise management.
 */
export const roleValidator = z.enum(["ADMIN", "MANAGER", "AGENT"]);

// Login schema
export const loginSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, "Password is required"),
  workspaceRole: z.enum(["ADMIN", "AGENT"]),
});

// Public sign-up schema
export const signupSchema = z.object({
  workspace: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name must not exceed 100 characters")
    .optional(),
  email: emailValidator,
  password: passwordValidator,
  accountType: z.literal("ADMIN").default("ADMIN"),
  name: nameValidator.optional(),
});

// OTP verification schema
export const verifyOtpSchema = z.object({
  email: emailValidator,
  otp: otpValidator,
});

// Resend OTP schema
export const resendOtpSchema = z.object({
  email: emailValidator,
});

// Admin sending workspace email invite schema
export const inviteMemberSchema = z.object({
  email: emailValidator,
  role: roleValidator,
});

// Member accepting invite schema
export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  name: nameValidator,
  password: passwordValidator,
});

// Admin manual user provisioning schema
export const createMemberSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
  role: roleValidator,
  clientAccountIds: z.array(z.string()).optional(),
});

// Helper for readable validation error extraction
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(". ");
}
