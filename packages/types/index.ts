export enum Role {
  CLIENT = 'CLIENT',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN'
}

export enum OrderStatus {
  REGISTERED = 'REGISTERED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum QuoteStatus {
  PENDING = 'PENDING',
  QUOTED = 'QUOTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNFEASIBLE = 'UNFEASIBLE'
}

export interface JwtPayload {
  userId: string;
  role: Role;
  iat?: number;
  exp?: number;
}
