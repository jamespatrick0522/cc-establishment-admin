import { http } from './http';
import type { Announcement } from '@/types/api';

export interface AnnouncementParams {
  city?: string;
  limit?: number;
}

export async function getAnnouncements(params: AnnouncementParams = {}): Promise<Announcement[]> {
  const { data } = await http.get<Announcement[]>('/announcements', {
    params: {
      city: params.city,
      limit: params.limit ?? 20,
    },
  });

  return data;
}
