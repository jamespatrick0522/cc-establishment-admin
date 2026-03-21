import { http } from './http';
import type { AuthResponse } from '@/types/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterEstablishmentPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function registerEstablishment(
  payload: RegisterEstablishmentPayload,
): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/register-establishment', payload);
  return data;
}
