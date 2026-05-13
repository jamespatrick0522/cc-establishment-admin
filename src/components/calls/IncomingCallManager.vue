<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Mic, MicOff, PhoneCall, PhoneIncoming, PhoneOff, X } from 'lucide-vue-next';

import { acceptCall, endCall, rejectCall } from '@/api/calls.api';
import { Button } from '@/components/ui/button';
import { joinAgoraVoiceCall, type ActiveVoiceCall } from '@/lib/agoraVoice';
import { chatSocketClient } from '@/socket/chat.socket';
import { useAuthStore } from '@/stores/auth';
import type { VoiceCall, VoiceCallEventPayload } from '@/types/api';

const authStore = useAuthStore();
const incomingCall = ref<VoiceCall | null>(null);
const incomingEstablishmentName = ref('');
const activeCall = ref<VoiceCall | null>(null);
const activeVoiceCall = ref<ActiveVoiceCall | null>(null);
const accepting = ref(false);
const rejecting = ref(false);
const muted = ref(false);
const errorMessage = ref('');
const now = ref(Date.now());
let timerHandle: number | null = null;

const showIncoming = computed(() => incomingCall.value?.status === 'ringing');
const showActive = computed(() => Boolean(activeCall.value && activeVoiceCall.value));
const callDuration = computed(() => {
  if (!activeCall.value?.acceptedAt || !showActive.value) {
    return '00:00';
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.value - new Date(activeCall.value.acceptedAt).getTime()) / 1000),
  );
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

function handleIncomingCall(payload: VoiceCallEventPayload) {
  if (activeCall.value || incomingCall.value) {
    return;
  }

  incomingCall.value = payload.call;
  incomingEstablishmentName.value = payload.establishmentName || 'your establishment';
  errorMessage.value = '';
}

async function leaveVoiceAudio() {
  if (activeVoiceCall.value) {
    await activeVoiceCall.value.leave();
    activeVoiceCall.value = null;
  }

  stopTimer();
  muted.value = false;
}

function startTimer() {
  stopTimer();
  now.value = Date.now();
  timerHandle = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
}

function stopTimer() {
  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

async function acceptIncomingCall() {
  if (!incomingCall.value) {
    return;
  }

  accepting.value = true;
  errorMessage.value = '';

  try {
    const response = await acceptCall(incomingCall.value.id);

    if (!response.agora) {
      throw new Error('Voice token was not returned.');
    }

    activeVoiceCall.value = await joinAgoraVoiceCall(response.agora);
    activeCall.value = response.call;
    incomingCall.value = null;
    startTimer();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || error?.message || 'Unable to accept this call.';
  } finally {
    accepting.value = false;
  }
}

async function rejectIncomingCall() {
  if (!incomingCall.value) {
    return;
  }

  rejecting.value = true;
  errorMessage.value = '';

  try {
    await rejectCall(incomingCall.value.id);
    incomingCall.value = null;
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Unable to decline this call.';
  } finally {
    rejecting.value = false;
  }
}

async function hangUp() {
  const callId = activeCall.value?.id;
  await leaveVoiceAudio();

  if (callId) {
    try {
      await endCall(callId);
    } catch {
      // The caller may already have ended the call.
    }
  }

  activeCall.value = null;
}

async function toggleMute() {
  if (!activeVoiceCall.value) {
    return;
  }

  muted.value = !muted.value;
  await activeVoiceCall.value.setMuted(muted.value);
}

function handleCallEnded(payload: VoiceCallEventPayload) {
  if (incomingCall.value?.id === payload.call.id) {
    incomingCall.value = null;
  }

  if (activeCall.value?.id === payload.call.id) {
    void leaveVoiceAudio();
    activeCall.value = null;
  }
}

onMounted(() => {
  if (authStore.accessToken) {
    chatSocketClient.connect(authStore.accessToken);
  }

  chatSocketClient.onCallIncoming(handleIncomingCall);
  chatSocketClient.onCallEnded(handleCallEnded);
});

onBeforeUnmount(() => {
  chatSocketClient.offCallIncoming(handleIncomingCall);
  chatSocketClient.offCallEnded(handleCallEnded);
  void leaveVoiceAudio();
});
</script>

<template>
  <div v-if="showIncoming" class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border bg-card p-5 shadow-2xl md:bottom-6">
    <div class="flex items-start gap-4">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/15">
        <PhoneIncoming class="h-6 w-6 text-secondary" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold uppercase tracking-wide text-secondary">Incoming call</p>
        <h3 class="mt-1 text-xl font-semibold text-foreground">{{ incomingCall?.guestFullName || 'Guest' }}</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Calling {{ incomingEstablishmentName }}
          <span v-if="incomingCall?.guestPhone"> • {{ incomingCall.guestPhone }}</span>
          <span v-else-if="incomingCall?.guestEmail"> • {{ incomingCall.guestEmail }}</span>
        </p>
        <p v-if="errorMessage" class="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage }}
        </p>
      </div>
      <Button variant="ghost" size="icon" class="h-9 w-9" @click="incomingCall = null">
        <X class="h-4 w-4" />
      </Button>
    </div>
    <div class="mt-4 flex justify-end gap-3">
      <Button variant="outline" class="h-11" :disabled="rejecting || accepting" @click="rejectIncomingCall">
        <PhoneOff class="mr-2 h-4 w-4" />
        Decline
      </Button>
      <Button class="h-11" :disabled="accepting || rejecting" @click="acceptIncomingCall">
        <PhoneCall class="mr-2 h-4 w-4" />
        {{ accepting ? 'Connecting...' : 'Accept' }}
      </Button>
    </div>
  </div>

  <div v-if="showActive" class="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-card p-4 shadow-2xl md:bottom-6 md:right-6">
    <div class="flex items-center gap-3">
      <div class="flex h-11 w-11 items-center justify-center rounded-full bg-success/15">
        <PhoneCall class="h-5 w-5 text-success" />
      </div>
      <div>
        <p class="font-semibold text-foreground">Connected call</p>
        <p class="text-sm text-muted-foreground">{{ activeCall?.guestFullName || 'Guest' }}</p>
        <p class="font-mono text-lg font-semibold text-primary">{{ callDuration }}</p>
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-3">
      <Button variant="outline" class="h-10" @click="toggleMute">
        <component :is="muted ? MicOff : Mic" class="mr-2 h-4 w-4" />
        {{ muted ? 'Unmute' : 'Mute' }}
      </Button>
      <Button variant="destructive" class="h-10" @click="hangUp">
        <PhoneOff class="mr-2 h-4 w-4" />
        End
      </Button>
    </div>
  </div>
</template>
