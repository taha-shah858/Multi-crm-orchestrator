import { z } from "zod";

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
export const emailValidator = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address format")
  .max(100, "Email must not exceed 100 characters");

/**
 * Enterprise Password Validator:
 * Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special character (@$!%*?&#).
 */
export const passwordValidator = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter (A-Z)")
  .regex(/[a-z]/, "Password must include at least one lowercase letter (a-z)")
  .regex(/[0-9]/, "Password must include at least one number (0-9)")
  .regex(/[@$!%*?&#]/, "Password must include at least one special character (@$!%*?&#)");

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
