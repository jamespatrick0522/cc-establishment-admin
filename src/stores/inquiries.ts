import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { ConversationSummary, MessageItem } from '@/types/api';

interface InquiryStoreState {
  conversationsByEstablishment: Record<string, ConversationSummary[]>;
  unreadByConversation: Record<string, number>;
  lastReadAtByConversation: Record<string, string>;
}

const STORAGE_KEY = 'establishment_inquiries_state';

function readState(): InquiryStoreState {
  const fallback: InquiryStoreState = {
    conversationsByEstablishment: {},
    unreadByConversation: {},
    lastReadAtByConversation: {},
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    return {
      ...fallback,
      ...(JSON.parse(raw) as Partial<InquiryStoreState>),
    };
  } catch {
    return fallback;
  }
}

function toScopedConversationKey(establishmentId: string, conversationKey: string): string {
  return `${establishmentId}::${conversationKey}`;
}

function toConversationKey(guestEmail?: string | null, guestPhone?: string | null): string | null {
  if (guestEmail?.trim()) {
    return `email:${guestEmail.trim().toLowerCase()}`;
  }

  if (guestPhone?.trim()) {
    return `phone:${guestPhone.trim().toLowerCase()}`;
  }

  return null;
}

export const useInquiriesStore = defineStore('inquiries', () => {
  const persisted = readState();

  const conversationsByEstablishment = ref<Record<string, ConversationSummary[]>>(
    persisted.conversationsByEstablishment,
  );
  const unreadByConversation = ref<Record<string, number>>(persisted.unreadByConversation);
  const lastReadAtByConversation = ref<Record<string, string>>(persisted.lastReadAtByConversation);
  const activeScopedConversationKey = ref<string | null>(null);

  const totalUnreadCount = computed(() => {
    return Object.values(unreadByConversation.value).reduce((sum, count) => sum + count, 0);
  });

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        conversationsByEstablishment: conversationsByEstablishment.value,
        unreadByConversation: unreadByConversation.value,
        lastReadAtByConversation: lastReadAtByConversation.value,
      }),
    );
  }

  function getConversations(establishmentId: string): ConversationSummary[] {
    return conversationsByEstablishment.value[establishmentId] ?? [];
  }

  function getConversationUnreadCount(establishmentId: string, conversationKey: string): number {
    return unreadByConversation.value[toScopedConversationKey(establishmentId, conversationKey)] ?? 0;
  }

  function getEstablishmentUnreadCount(establishmentId: string): number {
    return getConversations(establishmentId).reduce((sum, conversation) => {
      return sum + getConversationUnreadCount(establishmentId, conversation.conversationKey);
    }, 0);
  }

  function setConversations(establishmentId: string, conversations: ConversationSummary[]): void {
    const nextScopedKeys = new Set<string>();

    conversations.forEach((conversation) => {
      const scopedKey = toScopedConversationKey(establishmentId, conversation.conversationKey);
      nextScopedKeys.add(scopedKey);

      if (activeScopedConversationKey.value === scopedKey) {
        unreadByConversation.value[scopedKey] = 0;
        lastReadAtByConversation.value[scopedKey] =
          lastReadAtByConversation.value[scopedKey] || conversation.lastMessageAt;
        return;
      }

      const existingUnread = unreadByConversation.value[scopedKey];
      if (typeof existingUnread === 'number') {
        if (conversation.lastSenderRole !== 'tourist') {
          unreadByConversation.value[scopedKey] = 0;
        }

        return;
      }

      unreadByConversation.value[scopedKey] = conversation.lastSenderRole === 'tourist' ? 1 : 0;
    });

    Object.keys(unreadByConversation.value)
      .filter((scopedKey) => scopedKey.startsWith(`${establishmentId}::`) && !nextScopedKeys.has(scopedKey))
      .forEach((scopedKey) => {
        delete unreadByConversation.value[scopedKey];
        delete lastReadAtByConversation.value[scopedKey];
      });

    conversationsByEstablishment.value = {
      ...conversationsByEstablishment.value,
      [establishmentId]: conversations,
    };

    persist();
  }

  function markConversationRead(
    establishmentId: string,
    conversationKey: string,
    readAt = new Date().toISOString(),
  ): void {
    const scopedKey = toScopedConversationKey(establishmentId, conversationKey);
    unreadByConversation.value[scopedKey] = 0;
    lastReadAtByConversation.value[scopedKey] = readAt;
    persist();
  }

  function setActiveConversation(establishmentId: string, conversationKey: string | null): void {
    activeScopedConversationKey.value = conversationKey
      ? toScopedConversationKey(establishmentId, conversationKey)
      : null;

    if (conversationKey) {
      markConversationRead(establishmentId, conversationKey);
    }
  }

  function clearActiveConversation(): void {
    activeScopedConversationKey.value = null;
  }

  function applyIncomingMessage(message: MessageItem): string | null {
    const conversationKey = toConversationKey(message.guestEmail, message.guestPhone);
    if (!conversationKey) {
      return null;
    }

    const scopedKey = toScopedConversationKey(message.establishmentId, conversationKey);
    const current = getConversations(message.establishmentId);
    const existingIndex = current.findIndex((item) => item.conversationKey === conversationKey);
    const next = [...current];

    if (existingIndex >= 0) {
      const existing = next[existingIndex];
      if (!existing) {
        return null;
      }

      next[existingIndex] = {
        ...existing,
        guestFullName: existing.guestFullName || message.guestFullName,
        guestEmail: existing.guestEmail || message.guestEmail,
        guestPhone: existing.guestPhone || message.guestPhone,
        lastMessage: message.message,
        lastSenderRole: message.senderRole,
        lastMessageAt: message.createdAt,
        messageCount: existing.messageCount + 1,
      };
    } else {
      next.unshift({
        conversationKey,
        establishmentId: message.establishmentId,
        guestFullName: message.guestFullName,
        guestEmail: message.guestEmail,
        guestPhone: message.guestPhone,
        lastMessage: message.message,
        lastSenderRole: message.senderRole,
        lastMessageAt: message.createdAt,
        messageCount: 1,
      });
    }

    next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    conversationsByEstablishment.value = {
      ...conversationsByEstablishment.value,
      [message.establishmentId]: next,
    };

    if (activeScopedConversationKey.value === scopedKey) {
      markConversationRead(message.establishmentId, conversationKey, message.createdAt);
      return conversationKey;
    }

    if (message.senderRole === 'tourist') {
      unreadByConversation.value[scopedKey] = (unreadByConversation.value[scopedKey] ?? 0) + 1;
    }

    persist();
    return conversationKey;
  }

  function reset(): void {
    conversationsByEstablishment.value = {};
    unreadByConversation.value = {};
    lastReadAtByConversation.value = {};
    activeScopedConversationKey.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    conversationsByEstablishment,
    totalUnreadCount,
    getConversations,
    getConversationUnreadCount,
    getEstablishmentUnreadCount,
    setConversations,
    markConversationRead,
    setActiveConversation,
    clearActiveConversation,
    applyIncomingMessage,
    reset,
  };
});
