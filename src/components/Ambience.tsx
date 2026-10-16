import { useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef } from 'react';
import { BED_VOLUME, FX_VOLUME, SOUND_FILES, type Cue, type SoundId } from '@/content/ambience';

/** Una capa de sonido en bucle: entra y sale con un desvanecido suave. */
function Track({ id, active, volume, fast }: { id: SoundId; active: boolean; volume: number; fast?: boolean }) {
  const player = useAudioPlayer(SOUND_FILES[id]);
  const wasActive = useRef(false);

  useEffect(() => {
    try {
      player.loop = true;
      player.volume = 0;
    } catch {
      /* el sonido ambiente nunca debe romper la lectura */
    }
  }, [player]);

  // Al entrar, el sonido arranca desde el principio (así el "tan, tan" cae justo en su párrafo).
  useEffect(() => {
    if (active && !wasActive.current) {
      try {
        void player.seekTo(0);
      } catch {
        /* ignorar */
      }
    }
    wasActive.current = active;
  }, [active, player]);

  useEffect(() => {
    const target = active ? volume : 0;
    // Los efectos puntuales (golpes, aleteo) entran rápido; los fondos, suavemente.
    const step = fast ? 0.25 : 0.04;
    const timer = setInterval(() => {
      try {
        const cur = player.volume ?? 0;
        const next = cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step);
        player.volume = next;
        if (next > 0 && !player.playing) player.play();
        if (next === 0 && target === 0) {
          if (player.playing) player.pause();
          clearInterval(timer);
        } else if (next === target) clearInterval(timer);
      } catch {
        clearInterval(timer);
      }
    }, 90);
    return () => clearInterval(timer);
  }, [active, volume, player]);

  return null;
}

/**
 * Sonidos de ambiente durante la narración. Solo suenan mientras la narración está en marcha,
 * según el párrafo que se está leyendo (ver cuesFor en src/content/ambience.ts).
 */
export function Ambience({ cues, index, playing, enabled }: { cues: Cue[]; index: number; playing: boolean; enabled: boolean }) {
  const used = useMemo(() => {
    const beds = new Set<SoundId>();
    const fx = new Set<SoundId>();
    for (const c of cues) {
      if (c.bed) beds.add(c.bed);
      if (c.fx) fx.add(c.fx);
    }
    return { beds: [...beds], fx: [...fx] };
  }, [cues]);
  const cue = cues[Math.min(index, cues.length - 1)];
  const on = enabled && playing;
  return (
    <>
      {used.beds.map((id) => (
        <Track key={`bed-${id}`} id={id} volume={BED_VOLUME} active={on && cue?.bed === id} />
      ))}
      {used.fx.map((id) => (
        <Track key={`fx-${id}`} id={id} volume={FX_VOLUME} fast active={on && cue?.fx === id} />
      ))}
    </>
  );
}
