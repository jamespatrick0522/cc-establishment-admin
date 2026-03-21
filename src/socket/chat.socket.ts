import { io, Socket } from 'socket.io-client';

import type { ChatMessageFailedPayload, ChatMessageSentPayload, MessageItem } from '@/types/api';

export const CHAT_EVENTS = {
  JOIN_ESTABLISHMENT_INBOX: 'joinEstablishmentInbox',
  JOIN_GUEST_CONVERSATION: 'joinGuestConversation',
  LEAVE_GUEST_CONVERSATION: 'leaveGuestConversation',
  MESSAGE_NEW: 'message.new',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_FAILED: 'message.failed',
} as const;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/api\/v\d+\/?$/, '');
}

export interface JoinGuestConversationPayload {
  establishmentId: string;
  guestEmail?: string;
  guestPhone?: string;
}

export class ChatSocketClient {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || normalizeBaseUrl(apiBaseUrl);

    this.socket = io(`${wsBaseUrl}/chat`, {
      transports: ['websocket'],
      auth: {
        token: `Bearer ${token}`,
      },
    });

    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinEstablishmentInbox(establishmentId: string): void {
    this.socket?.emit(CHAT_EVENTS.JOIN_ESTABLISHMENT_INBOX, { establishmentId });
  }

  joinGuestConversation(payload: JoinGuestConversationPayload): void {
    this.socket?.emit(CHAT_EVENTS.JOIN_GUEST_CONVERSATION, payload);
  }

  leaveGuestConversation(payload: JoinGuestConversationPayload): void {
    this.socket?.emit(CHAT_EVENTS.LEAVE_GUEST_CONVERSATION, payload);
  }

  onMessageNew(handler: (payload: MessageItem) => void): void {
    this.socket?.on(CHAT_EVENTS.MESSAGE_NEW, handler);
  }

  offMessageNew(handler: (payload: MessageItem) => void): void {
    this.socket?.off(CHAT_EVENTS.MESSAGE_NEW, handler);
  }

  onMessageSent(handler: (payload: ChatMessageSentPayload) => void): void {
    this.socket?.on(CHAT_EVENTS.MESSAGE_SENT, handler);
  }

  offMessageSent(handler: (payload: ChatMessageSentPayload) => void): void {
    this.socket?.off(CHAT_EVENTS.MESSAGE_SENT, handler);
  }

  onMessageFailed(handler: (payload: ChatMessageFailedPayload) => void): void {
    this.socket?.on(CHAT_EVENTS.MESSAGE_FAILED, handler);
  }

  offMessageFailed(handler: (payload: ChatMessageFailedPayload) => void): void {
    this.socket?.off(CHAT_EVENTS.MESSAGE_FAILED, handler);
  }

  offAll(): void {
    this.socket?.removeAllListeners();
  }
}

export const chatSocketClient = new ChatSocketClient();
