import { request, post } from './client';
import type { Doctor, Patient } from '../store';

export type SessionIdentity =
  | { role: 'PATIENT'; accountId: string; profile: Patient }
  | { role: 'DOCTOR'; accountId: string; profile: Doctor };

export const authApi = {
  me: () => request<SessionIdentity>('/auth/me'),
  login: (username: string, password: string) => post<SessionIdentity>('/auth/login', { username, password }),
  logout: () => post<{ message: string }>('/auth/logout'),
};
