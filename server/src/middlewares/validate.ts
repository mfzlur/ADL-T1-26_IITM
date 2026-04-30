import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod validation middleware factory.
 *
 * Usage in a route file:
 *   router.post('/register', validate(RegisterSchema), AuthController.register);
 *
 * On success  → req.body is replaced with the parsed+coerced Zod output, next() called.
 * On failure  → 400 with { message, errors: { fieldName: "first error message" } }
 *
 * Using safeParse (never throws) keeps error handling predictable and lets
 * us return structured per-field errors the frontend can map to form fields.
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Flatten ZodError into { fieldErrors: { field: string[] }, formErrors: string[] }
      // then pick only the first message per field for a compact API response.
      const flat   = result.error.flatten();
      const errors = Object.fromEntries(
        Object.entries(flat.fieldErrors).map(([key, msgs]) => [key, (msgs as string[])?.[0] ?? 'Invalid value'])
      );

      res.status(400).json({ message: 'Validation failed', errors });
      return;
    }

    // Replace req.body with the Zod-parsed output so:
    //   - string numbers are coerced to actual numbers (e.g. multipart capacity)
    //   - unknown fields are stripped
    //   - trimmed strings are trimmed
    req.body = result.data;
    next();
  };
