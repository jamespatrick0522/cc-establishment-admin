import { http } from './http';
import type {
  BusinessStatus,
  Establishment,
  EstablishmentCategory,
  ListingStatus,
  PaginatedResponse,
} from '@/types/api';

export interface CreateEstablishmentPayload {
  city: string;
  name: string;
  category: EstablishmentCategory;
  address: string;
  description?: string;
  services?: string;
  contactNumber?: string;
  email?: string;
  opensAt?: string;
  closesAt?: string;
  isOpenNow?: boolean;
}

export interface MyEstablishmentsParams {
  listingStatus?: ListingStatus;
  page?: number;
  pageSize?: number;
}

export interface UpdateEstablishmentStatusPayload {
  businessStatus?: BusinessStatus;
  isOpenNow?: boolean;
  statusNote?: string;
}

export interface UpdateEstablishmentLocationPayload {
  latitude: number;
  longitude: number;
  address?: string;
}

export async function getMyEstablishments(
  params: MyEstablishmentsParams = {},
): Promise<PaginatedResponse<Establishment>> {
  const { data } = await http.get<PaginatedResponse<Establishment>>('/establishments/mine', {
    params,
  });

  return data;
}

export async function createEstablishment(
  payload: CreateEstablishmentPayload,
): Promise<Establishment> {
  const { data } = await http.post<Establishment>('/establishments', payload);
  return data;
}

export async function getEstablishmentById(id: string): Promise<Establishment> {
  const { data } = await http.get<Establishment>(`/establishments/${id}`);
  return data;
}

export async function updateEstablishmentStatus(
  id: string,
  payload: UpdateEstablishmentStatusPayload,
): Promise<Establishment> {
  const { data } = await http.patch<Establishment>(`/establishments/${id}/status`, payload);
  return data;
}

export async function updateEstablishmentLocation(
  id: string,
  payload: UpdateEstablishmentLocationPayload,
): Promise<Establishment> {
  const { data } = await http.patch<Establishment>(`/establishments/${id}/location`, payload);
  return data;
}

export async function uploadEstablishmentCoverPhoto(id: string, file: File): Promise<Establishment> {
  const formData = new FormData();
  formData.append('photo', file);

  const { data } = await http.post<Establishment>(`/establishments/${id}/cover-photo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}
