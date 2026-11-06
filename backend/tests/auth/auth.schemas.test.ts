import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  registerMentorSchema,
  registerSchema,
} from '../../src/modules/auth/auth.schemas.js';

describe('registerSchema', () => {
  const valid = { username: 'jane', email: 'jane@example.com', password: 'secret1' };

  it('accepts valid input', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', () => {
    const result = registerSchema.safeParse({ ...valid, password: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects a password longer than 72 characters', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'a'.repeat(73) });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = registerSchema.safeParse({ email: valid.email });
    expect(result.success).toBe(false);
  });
});

describe('registerMentorSchema', () => {
  it('accepts account details without asking for a biography', () => {
    const result = registerMentorSchema.safeParse({
      username: 'jane',
      email: 'jane@example.com',
      password: 'secret1',
    });
    expect(result.success).toBe(true);
  });

  it('does not include legacy biography input in account creation data', () => {
    const result = registerMentorSchema.parse({
      username: 'jane',
      email: 'jane@example.com',
      password: 'secret1',
      bio: 'Legacy biography',
    });
    expect(result).not.toHaveProperty('bio');
  });
});

describe('loginSchema', () => {
  it('accepts valid input', () => {
    expect(loginSchema.safeParse({ email: 'jane@example.com', password: 'secret1' }).success).toBe(
      true,
    );
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({ email: 'jane@example.com' }).success).toBe(false);
  });
});
