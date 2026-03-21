import { http } from './http';
import type {
  ConversationSummary,
  GuestConversationResponse,
  MessageItem,
  PaginatedResponse,
} from '@/types/api';

export interface ConversationParams {
  establishmentId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface GuestConversationParams {
  establishmentId: string;
  guestEmail?: string;
  guestPhone?: string;
  page?: number;
  pageSize?: number;
}

export interface ReplyToGuestPayload {
  establishmentId: string;
  guestEmail?: string;
  guestPhone?: string;
  guestFullName?: string;
  message: string;
  clientRequestId?: string;
}

export async function getConversations(
  params: ConversationParams,
): Promise<PaginatedResponse<ConversationSummary>> {
  const { data } = await http.get<PaginatedResponse<ConversationSummary>>('/messages/conversations', {
    params,
  });

  return data;
}

export async function getGuestConversation(
  params: GuestConversationParams,
): Promise<GuestConversationResponse> {
  const { data } = await http.get<GuestConversationResponse>('/messages/guest-conversation', {
    params,
  });

  return data;
}

export async function replyToGuest(payload: ReplyToGuestPayload): Promise<MessageItem> {
  const { data } = await http.post<MessageItem>('/messages/reply', payload);
  return data;
}
