let cachedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!cachedAudioContext) {
    cachedAudioContext = new AudioContextCtor();
  }
  return cachedAudioContext;
}

type ToneConfig = {
  freq: number;
  at: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

function playTones(tones: ToneConfig[]): void {
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;

  try {
    if (context.state === "suspended") {
      void context.resume();
    }

    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startTime = now + tone.at;
      const endTime = startTime + tone.duration;
      const volume = tone.gain ?? 0.08;

      oscillator.type = tone.type ?? "sine";
      oscillator.frequency.setValueAtTime(tone.freq, startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.01);
    }
  } catch {
    // Swallow audio failures to avoid breaking UI interactions.
  }
}

export function playLikeSound(): void {
  playTones([
    { freq: 510, at: 0, duration: 0.08, type: "triangle", gain: 0.08 },
    { freq: 690, at: 0.065, duration: 0.09, type: "triangle", gain: 0.07 },
  ]);
}

export function playSendSound(): void {
  playTones([
    { freq: 780, at: 0, duration: 0.06, type: "sine", gain: 0.055 },
    { freq: 980, at: 0.045, duration: 0.07, type: "sine", gain: 0.05 },
    { freq: 1260, at: 0.095, duration: 0.06, type: "sine", gain: 0.045 },
  ]);
}
