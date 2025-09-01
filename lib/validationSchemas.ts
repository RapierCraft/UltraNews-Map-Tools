import { z } from "zod"

export const emailSignInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
})

export const emailSignUpSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long")
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^\+[1-9]\d{1,14}$/, "Please enter a valid international phone number"),
})

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must contain only numbers"),
})

export const userRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  phone: z.string().optional(),
})

export type EmailSignInData = z.infer<typeof emailSignInSchema>
export type EmailSignUpData = z.infer<typeof emailSignUpSchema>
export type PhoneData = z.infer<typeof phoneSchema>
export type OtpData = z.infer<typeof otpSchema>
export type UserRegistrationData = z.infer<typeof userRegistrationSchema>