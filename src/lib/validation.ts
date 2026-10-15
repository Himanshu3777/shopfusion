import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address").max(254);
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const addressSchema = z.object({
  label: z.string().max(30).default("Home"),
  fullName: z.string().min(1).max(100),
  phone: z.string().min(6).max(20),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().max(100).default("India"),
  isDefault: z.boolean().default(false),
});

export const productUpsertSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(220).optional(),
  description: z.string().min(1),
  sku: z.string().min(1).max(100),
  price: z.number().positive(),
  discountPrice: z.number().nonnegative().optional().nullable(),
  stock: z.number().int().min(0),
  weight: z.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().max(200).optional() })).default([]),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        sku: z.string().min(1).max(100),
        price: z.number().nonnegative().optional().nullable(),
        stock: z.number().int().min(0).default(0),
        attributes: z.record(z.string(), z.string()).optional(),
      })
    )
    .default([]),
});

export const reviewUpsertSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

export const couponUpsertSchema = z.object({
  code: z.string().min(3).max(30),
  description: z.string().max(500).optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().nonnegative().optional().nullable(),
  maxDiscount: z.number().nonnegative().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional().nullable(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  addressId: z.string().min(1),
  couponCode: z.string().max(30).optional().nullable(),
  paymentProvider: z.enum(["MOCK", "COD"]).default("MOCK"),
});
