import { z } from 'zod';
import { insertBookingSchema, users, services, bookings, customers, shops } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

export type UserWithShop = typeof users.$inferSelect & { shop: typeof shops.$inferSelect | null };

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<UserWithShop>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<UserWithShop | null>(),
      },
    }
  },
  services: {
    list: {
      method: 'GET' as const,
      path: '/api/services',
      responses: {
        200: z.array(z.custom<typeof services.$inferSelect>()),
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers',
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { serviceName: string }>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/bookings/:id',
      responses: {
        200: z.custom<typeof bookings.$inferSelect & { serviceName: string }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    approve: {
      method: 'PATCH' as const,
      path: '/api/bookings/:id/approve',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    reject: {
      method: 'PATCH' as const,
      path: '/api/bookings/:id/reject',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    requestDeposit: {
      method: 'PATCH' as const,
      path: '/api/bookings/:id/deposit-request',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    confirmDeposit: {
      method: 'PATCH' as const,
      path: '/api/bookings/:id/deposit-confirm',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type LoginInput = z.infer<typeof api.auth.login.input>;
export type CreateBookingInput = z.infer<typeof api.bookings.create.input>;
