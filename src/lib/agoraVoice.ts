import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

import type { VoiceCallTokenPayload } from '@/types/api';

export interface ActiveVoiceCall {
  setMuted: (muted: boolean) => Promise<void>;
  leave: () => Promise<void>;
}

export async function joinAgoraVoiceCall(session: VoiceCallTokenPayload): Promise<ActiveVoiceCall> {
  const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
  const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  let localAudioTrack: IMicrophoneAudioTrack | null = null;

  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);

    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
  });

  client.on('user-unpublished', (user) => {
    user.audioTrack?.stop();
  });

  await client.join(session.appId, session.channelName, session.token, session.uid);
  localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([localAudioTrack]);

  return {
    setMuted(muted: boolean) {
      return localAudioTrack?.setMuted(muted) ?? Promise.resolve();
    },
    async leave() {
      localAudioTrack?.stop();
      localAudioTrack?.close();
      localAudioTrack = null;

      client.remoteUsers.forEach((user) => {
        user.audioTrack?.stop();
        (user.videoTrack as ICameraVideoTrack | undefined)?.stop();
      });

      client.removeAllListeners();
      await client.leave();
    },
  };
}
