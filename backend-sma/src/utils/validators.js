import { z } from "zod";

export const registerCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(8, "Password must be at least 8 characters"),
  isConsent: z.boolean().default(false)
});

export const registerStoreSchema = z.object({
  storeName: z.string().min(1),
  typeStore: z.string().min(1),
  ownerStore: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  address: z.string().min(1),
  timeAvailable: z.string().min(1),
  password: z.string().min(8),
  isConsent: z.boolean().default(false)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const emailOnlySchema = z.object({ email: z.string().email() });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8)
});
