<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { getMyEstablishments } from '@/api/establishments.api';
import { getConversations, getGuestConversation, replyToGuest } from '@/api/messages.api';
import PageHeader from '@/components/common/PageHeader.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { chatSocketClient } from '@/socket/chat.socket';
import { useAuthStore } from '@/stores/auth';
import { useInquiriesStore } from '@/stores/inquiries';
import type { ConversationSummary, Establishment, MessageItem } from '@/types/api';

const authStore = useAuthStore();
const inquiriesStore = useInquiriesStore();

const loading = ref(false);
const sending = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const establishments = ref<Establishment[]>([]);
const selectedEstablishmentId = ref('');
const search = ref('');

const conversations = ref<ConversationSummary[]>([]);
const selectedConversation = ref<ConversationSummary | null>(null);
const messages = ref<MessageItem[]>([]);
const replyText = ref('');
const threadContainer = ref<HTMLElement | null>(null);

const isTouchDevice =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

function toConversationKey(guestEmail?: string | null, guestPhone?: string | null): string | null {
  if (guestEmail?.trim()) {
    return `email:${guestEmail.trim().toLowerCase()}`;
  }

  if (guestPhone?.trim()) {
    return `phone:${guestPhone.trim().toLowerCase()}`;
  }

  return null;
}

const canSend = computed(() => {
  return Boolean(selectedConversation.value && replyText.value.trim());
});

async function scrollToLatest() {
  await nextTick();

  if (!threadContainer.value) {
    return;
  }

  threadContainer.value.scrollTop = threadContainer.value.scrollHeight;
}

async function loadEstablishments() {
  const response = await getMyEstablishments({ page: 1, pageSize: 20 });
  establishments.value = response.data;

  const first = response.data[0];
  if (!selectedEstablishmentId.value && first) {
    selectedEstablishmentId.value = first.id;
  }
}

async function loadConversations() {
  if (!selectedEstablishmentId.value) {
    conversations.value = [];
    selectedConversation.value = null;
    messages.value = [];
    return;
  }

  loading.value = true;

  try {
    const response = await getConversations({
      establishmentId: selectedEstablishmentId.value,
      search: search.value.trim() || undefined,
      page: 1,
      pageSize: 100,
    });

    conversations.value = response.data;
    inquiriesStore.setConversations(selectedEstablishmentId.value, response.data);

    if (selectedConversation.value) {
      const matched = response.data.find((x) => x.conversationKey === selectedConversation.value!.conversationKey);
      selectedConversation.value = matched || null;
    }

    const firstConversation = response.data[0];
    if (!selectedConversation.value && firstConversation) {
      await selectConversation(firstConversation);
    }
  } finally {
    loading.value = false;
  }
}

async function selectConversation(conversation: ConversationSummary) {
  if (!selectedEstablishmentId.value) {
    messages.value = [];
    return;
  }

  const previousConversation = selectedConversation.value;
  selectedConversation.value = conversation;
  inquiriesStore.setActiveConversation(selectedEstablishmentId.value, conversation.conversationKey);

  if (previousConversation && previousConversation.conversationKey !== conversation.conversationKey) {
    chatSocketClient.leaveGuestConversation({
      establishmentId: selectedEstablishmentId.value,
      guestEmail: previousConversation.guestEmail || undefined,
      guestPhone: previousConversation.guestPhone || undefined,
    });
  }

  const response = await getGuestConversation({
    establishmentId: selectedEstablishmentId.value,
    guestEmail: conversation.guestEmail || undefined,
    guestPhone: conversation.guestPhone || undefined,
    page: 1,
    pageSize: 200,
  });

  messages.value = response.data;
  await scrollToLatest();
  inquiriesStore.markConversationRead(
    selectedEstablishmentId.value,
    conversation.conversationKey,
    response.data[response.data.length - 1]?.createdAt || new Date().toISOString(),
  );

  chatSocketClient.joinGuestConversation({
    establishmentId: selectedEstablishmentId.value,
    guestEmail: conversation.guestEmail || undefined,
    guestPhone: conversation.guestPhone || undefined,
  });
}

async function sendReply() {
  if (!selectedEstablishmentId.value || !selectedConversation.value || !replyText.value.trim()) {
    return;
  }

  sending.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await replyToGuest({
      establishmentId: selectedEstablishmentId.value,
      guestEmail: selectedConversation.value.guestEmail || undefined,
      guestPhone: selectedConversation.value.guestPhone || undefined,
      guestFullName: selectedConversation.value.guestFullName || undefined,
      message: replyText.value.trim(),
      clientRequestId: crypto.randomUUID(),
    });

    replyText.value = '';
    await scrollToLatest();
    successMessage.value = 'Reply sent.';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Failed to send reply.';
  } finally {
    sending.value = false;
  }
}

function handleMessageNew(message: MessageItem) {
  if (!selectedEstablishmentId.value || message.establishmentId !== selectedEstablishmentId.value) {
    return;
  }

  const key = toConversationKey(message.guestEmail, message.guestPhone);
  if (!key) {
    return;
  }

  const existingIndex = conversations.value.findIndex((item) => item.conversationKey === key);

  if (existingIndex >= 0) {
    const current = conversations.value[existingIndex];
    if (!current) {
      return;
    }

    conversations.value[existingIndex] = {
      ...current,
      guestFullName: current.guestFullName || message.guestFullName,
      guestEmail: current.guestEmail || message.guestEmail,
      guestPhone: current.guestPhone || message.guestPhone,
      lastMessage: message.message,
      lastSenderRole: message.senderRole,
      lastMessageAt: message.createdAt,
      messageCount: current.messageCount + 1,
    };
  } else {
    conversations.value.unshift({
      conversationKey: key,
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

  conversations.value.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  if (selectedConversation.value?.conversationKey === key) {
    messages.value.push(message);
    void scrollToLatest();
    inquiriesStore.markConversationRead(selectedEstablishmentId.value, key, message.createdAt);
  }
}

function getUnreadCount(conversation: ConversationSummary): number {
  if (!selectedEstablishmentId.value) {
    return 0;
  }

  return inquiriesStore.getConversationUnreadCount(selectedEstablishmentId.value, conversation.conversationKey);
}

function handleReplyKeydown(event: KeyboardEvent) {
  if (isTouchDevice) {
    return;
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();

    if (canSend.value && !sending.value) {
      void sendReply();
    }
  }
}

onMounted(async () => {
  try {
    if (authStore.accessToken) {
      chatSocketClient.connect(authStore.accessToken);
      chatSocketClient.onMessageNew(handleMessageNew);
    }

    await loadEstablishments();
    await loadConversations();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Unable to load inquiries.';
  }
});

watch(selectedEstablishmentId, async (value, oldValue) => {
  if (!value) {
    return;
  }

  if (oldValue && selectedConversation.value) {
    chatSocketClient.leaveGuestConversation({
      establishmentId: oldValue,
      guestEmail: selectedConversation.value.guestEmail || undefined,
      guestPhone: selectedConversation.value.guestPhone || undefined,
    });
  }

  inquiriesStore.clearActiveConversation();
  selectedConversation.value = null;
  messages.value = [];
  await loadConversations();
});

onBeforeUnmount(() => {
  inquiriesStore.clearActiveConversation();
  chatSocketClient.offMessageNew(handleMessageNew);
});
</script>

<template>
  <div>
    <PageHeader
      title="Guest Inquiries"
      subtitle="Respond to tourist inquiries in real time with an easy inbox-style workflow."
    />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select v-model="selectedEstablishmentId" class="h-11 min-w-[280px] rounded-md border bg-background px-3 text-base">
        <option value="" disabled>Select establishment</option>
        <option v-for="item in establishments" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>

      <Input v-model="search" class="h-11 max-w-md" placeholder="Search guest name, email, phone, message" />
      <Button class="h-11" variant="secondary" @click="loadConversations">Refresh</Button>
    </div>

    <div v-if="errorMessage" class="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="mb-3 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
      {{ successMessage }}
    </div>

    <div class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card class="shadow-panel">
        <CardHeader>
          <CardTitle class="text-xl">Conversations</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-if="loading" class="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">Loading conversations...</div>
          <div v-else-if="!conversations.length" class="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            No conversations yet for this establishment.
          </div>

          <button
            v-for="item in conversations"
            :key="item.conversationKey"
            class="w-full rounded-lg border p-3 text-left transition hover:bg-muted"
            :class="selectedConversation?.conversationKey === item.conversationKey ? 'border-primary bg-primary/5' : ''"
            @click="selectConversation(item)"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <p class="font-semibold">{{ item.guestFullName || item.guestEmail || item.guestPhone || 'Guest' }}</p>
              <div class="flex items-center gap-2">
                <Badge v-if="getUnreadCount(item)" class="rounded-full bg-accent px-2 text-accent-foreground">
                  {{ getUnreadCount(item) > 99 ? '99+' : getUnreadCount(item) }}
                </Badge>
                <Badge variant="secondary">{{ item.messageCount }}</Badge>
              </div>
            </div>
            <p class="line-clamp-1 text-sm text-muted-foreground">{{ item.lastMessage }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ new Date(item.lastMessageAt).toLocaleString() }}</p>
          </button>
        </CardContent>
      </Card>

      <Card class="shadow-panel">
        <CardHeader>
          <CardTitle class="text-xl">Conversation Thread</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="!selectedConversation" class="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Select a conversation from the left panel.
          </div>

          <div v-else>
            <div class="mb-4 rounded-lg border bg-muted/20 p-3">
              <p class="font-medium">{{ selectedConversation.guestFullName || 'Guest' }}</p>
              <p class="text-sm text-muted-foreground">
                {{ selectedConversation.guestEmail || 'No email' }}
                <span v-if="selectedConversation.guestPhone"> • {{ selectedConversation.guestPhone }}</span>
              </p>
            </div>

            <div ref="threadContainer" class="mb-4 max-h-[460px] space-y-3 overflow-y-auto rounded-lg border bg-background p-3">
              <div v-if="!messages.length" class="text-sm text-muted-foreground">No messages yet.</div>

              <div
                v-for="item in messages"
                :key="item.id"
                class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
                :class="item.senderRole === 'establishment' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted text-foreground'"
              >
                <p class="whitespace-pre-wrap">{{ item.message }}</p>
                <p class="mt-1 text-[11px] opacity-80">{{ new Date(item.createdAt).toLocaleString() }}</p>
              </div>
            </div>

            <form class="space-y-3" @submit.prevent="sendReply">
              <Textarea
                v-model="replyText"
                class="min-h-[110px]"
                placeholder="Type your reply to guest..."
                @keydown="handleReplyKeydown"
              />
              <p v-if="!isTouchDevice" class="text-xs text-muted-foreground">
                Press Enter to send. Use Shift + Enter for a new line.
              </p>
              <Button class="h-11 text-base" :disabled="sending || !canSend">
                {{ sending ? 'Sending...' : 'Send Reply' }}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

