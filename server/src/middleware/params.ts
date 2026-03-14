import type { Request, Response } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Safely extract a single route param as string. */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Validate a UUID string format. Returns true if valid. */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/** Extract and validate a UUID path param. Sends 400 if invalid. Returns the UUID or null. */
export function uuidParam(req: Request, res: Response, name: string): string | null {
  const value = param(req, name);
  if (!isValidUUID(value)) {
    res.status(400).json({ error: `Invalid ${name} format — expected UUID` });
    return null;
  }
  return value;
}
