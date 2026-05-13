import { http } from './http';
import type { VoiceCallResponse } from '@/types/api';

export async function acceptCall(callId: string): Promise<VoiceCallResponse> {
  const { data } = await http.post<VoiceCallResponse>(`/calls/${callId}/accept`, {});
  return data;
}

export async function rejectCall(callId: string): Promise<VoiceCallResponse> {
  const { data } = await http.post<VoiceCallResponse>(`/calls/${callId}/reject`, {});
  return data;
}

export async function endCall(callId: string): Promise<VoiceCallResponse> {
  const { data } = await http.post<VoiceCallResponse>(`/calls/${callId}/end`, {});
  return data;
}
