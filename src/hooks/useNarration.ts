import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeCast } from '@/services/reparto';
import { getSpanishVoice, voicesForCast } from '@/services/speech';

/**
 * De dónde sale la voz de una historia (estrategia de voz mixta):
 *  - 'audio': grabación de un narrador real (archivo local o URL).
 *  - 'tts':   voz sintética genérica del teléfono, leyendo el texto en español.
 */
export type NarrationSource =
  | {
      kind: 'audio';
      uri: string;
      /** Audio incluido en la app (resultado de `require`); tiene prioridad sobre `uri`. */
      asset?: number;
      paragraphs: string[];
      /** Fracción del audio (0–1) donde empieza y termina la lectura del texto. */
      textStart?: number;
      textEnd?: number;
      /** Fracción exacta (0–1) en que empieza cada párrafo, si se conoce. */
      paragraphStarts?: number[];
    }
  | { kind: 'tts'; paragraphs: string[] };

interface Options {
  source: NarrationSource;
  rate: number;
  /** Voz del teléfono elegida en Ajustes (solo para el modo TTS). */
  voiceId?: string | null;
  /** Leer los diálogos con una voz distinta por personaje (solo voz del teléfono). */
  multiVoice?: boolean;
  startParagraph: number;
  onParagraph?: (index: number) => void;
  onComplete?: () => void;
  /** Se llama cada TICK_SEC segundos mientras suena, para sumar tiempo escuchado. */
  onListenTick?: (seconds: number) => void;
}

const TICK_SEC = 5;

/**
 * Android no lee textos de más de ~4000 caracteres de una vez: el botón queda en «play» sin sonar nada.
 * Los párrafos largos (frecuentes en los PDF) se parten en trozos por frases.
 */
const MAX_SPEECH_CHARS = 2800;
export function chunkText(text: string, max = MAX_SPEECH_CHARS): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?…;:]+[.!?…;:]*["”»)]*\s*/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  const push = (piece: string) => {
    // Una «frase» sin puntuación más larga que el máximo se corta en palabras.
    for (let i = 0; i < piece.length; i += max) {
      const part = piece.length <= max ? piece : piece.slice(i, i + max);
      if (cur && (cur + part).length > max) (out.push(cur.trim()), (cur = ''));
      cur += part;
      if (piece.length <= max) break;
    }
  };
  for (const sn of sentences) push(sn);
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/**
 * Reproductor unificado con lectura sincronizada por párrafo.
 * En modo audio no hay marcas de tiempo por párrafo, así que el párrafo
 * activo se estima por la proporción de texto (suficiente para leer a la par).
 */
export function useNarration({ source, rate, voiceId, multiVoice = true, startParagraph, onParagraph, onComplete, onListenTick }: Options) {
  const { paragraphs } = source;
  const isAudio = source.kind === 'audio';

  // Callbacks en refs para no reiniciar la narración cuando cambian.
  const onParagraphRef = useRef(onParagraph);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onListenTick);
  onParagraphRef.current = onParagraph;
  onCompleteRef.current = onComplete;
  onTickRef.current = onListenTick;

  // Fracción del AUDIO en la que empieza cada párrafo (modo audio): se reparte
  // el tramo leído [textStart, textEnd] en proporción a la longitud de cada párrafo.
  const textStart = source.kind === 'audio' ? source.textStart ?? 0 : 0;
  const textEnd = source.kind === 'audio' ? source.textEnd ?? 1 : 1;
  const exactStarts = source.kind === 'audio' ? source.paragraphStarts : undefined;
  const boundaries = useMemo(() => {
    // Marcas exactas generadas junto con el audio: resaltado preciso.
    if (exactStarts && exactStarts.length === paragraphs.length) return exactStarts;
    const lengths = paragraphs.map((p) => p.length);
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return lengths.map((len) => {
      const start = textStart + (acc / total) * (textEnd - textStart);
      acc += len;
      return start;
    });
  }, [paragraphs, textStart, textEnd, exactStarts]);

  // ---------- Modo audio (narrador real) ----------
  const player = useAudioPlayer(isAudio ? source.asset ?? { uri: source.uri } : null);
  const status = useAudioPlayerStatus(player);
  const restored = useRef(false);

  // ---------- Modo TTS (voz del teléfono) ----------
  const [ttsIndex, setTtsIndex] = useState(Math.min(startParagraph, paragraphs.length - 1));
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsFailed, setTtsFailed] = useState(false);
  const generation = useRef(0); // invalida callbacks de narraciones anteriores
  const rateRef = useRef(rate);
  // Quién habla en cada párrafo (solo con voz del teléfono): permite una voz por personaje.
  const cast = useMemo(() => {
    if (isAudio || !multiVoice) return null;
    try {
      return analyzeCast(paragraphs);
    } catch {
      return null; // si el análisis de personajes falla, se lee con una sola voz
    }
  }, [isAudio, multiVoice, paragraphs]);

  const audioIndex = useMemo(() => {
    if (!isAudio || !status.duration) return Math.min(startParagraph, paragraphs.length - 1);
    const frac = status.currentTime / status.duration;
    let idx = 0;
    for (let i = 0; i < boundaries.length; i++) if (frac >= boundaries[i]) idx = i;
    return idx;
  }, [isAudio, status.currentTime, status.duration, boundaries, startParagraph, paragraphs.length]);

  const index = isAudio ? audioIndex : ttsIndex;
  const playing = isAudio ? status.playing : ttsPlaying;

  useEffect(() => {
    onParagraphRef.current?.(index);
  }, [index]);

  const stopTts = useCallback(() => {
    generation.current++;
    Speech.stop();
    setTtsPlaying(false);
  }, []);

  const speakFrom = useCallback(
    async (start: number) => {
      const gen = ++generation.current;
      await Speech.stop();
      const voice = await getSpanishVoice(voiceId);
      // La asignación de voces no debe impedir leer: si tarda más de 2 s o falla, se lee con una sola voz.
      const assignments =
        cast && cast.characters.length
          ? await Promise.race([voicesForCast(cast, voice).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 2000))])
          : null;
      if (gen !== generation.current) return;
      setTtsPlaying(true);

      let failures = 0;
      setTtsFailed(false);
      const speakOne = (i: number) => {
        if (gen !== generation.current) return;
        if (i >= paragraphs.length) {
          setTtsPlaying(false);
          setTtsIndex(0);
          onCompleteRef.current?.();
          return;
        }
        setTtsIndex(i);
        // Un párrafo = varios trozos (narración y lo que dice cada personaje), uno tras otro; los largos se parten.
        const base = assignments && cast ? cast.paragraphs[i] : [{ speaker: 'narrador', text: paragraphs[i] }];
        const parts = base.flatMap((seg) => chunkText(seg.text).map((text) => ({ speaker: seg.speaker, text })));
        const speakPart = (k: number) => {
          if (gen !== generation.current) return;
          if (k >= parts.length) return speakOne(i + 1);
          const a = assignments?.[parts[k].speaker];
          Speech.speak(parts[k].text, {
            language: 'es-PE',
            voice: a?.voice || voice || undefined,
            pitch: a?.pitch,
            rate: rateRef.current * (a?.rate ?? 1),
            onDone: () => {
              failures = 0;
              speakPart(k + 1);
            },
            // Si un trozo falla, se sigue con el siguiente; si fallan varios seguidos, se avisa en vez de quedarse mudo.
            onError: () => {
              if (gen !== generation.current) return;
              if (++failures >= 3) {
                setTtsFailed(true);
                setTtsPlaying(false);
                return;
              }
              speakPart(k + 1);
            },
          });
        };
        speakPart(0);
      };
      speakOne(start);
    },
    [paragraphs, voiceId, cast]
  );

  // Restaurar posición guardada en modo audio cuando el archivo cargó.
  useEffect(() => {
    if (!isAudio || restored.current || !status.isLoaded || !status.duration) return;
    restored.current = true;
    if (startParagraph > 0) player.seekTo(boundaries[startParagraph] * status.duration);
    // Empezar donde empieza el texto: se salta la presentación de LibriVox («Esta grabación es de dominio público…»).
    else if (textStart > 0) player.seekTo(textStart * status.duration);
  }, [isAudio, status.isLoaded, status.duration, startParagraph, boundaries, player, textStart]);

  // Terminar donde termina el texto: se salta el cierre de la grabación.
  const endedRef = useRef(false);
  useEffect(() => {
    if (!isAudio || !status.duration || textEnd >= 1) return;
    if (status.playing && !endedRef.current && status.currentTime >= textEnd * status.duration) {
      endedRef.current = true;
      player.pause();
      onCompleteRef.current?.();
    } else if (status.currentTime < textEnd * status.duration - 2) endedRef.current = false;
  }, [isAudio, status.playing, status.currentTime, status.duration, textEnd, player]);

  // Fin del audio del narrador.
  useEffect(() => {
    if (isAudio && status.didJustFinish) onCompleteRef.current?.();
  }, [isAudio, status.didJustFinish]);

  // Velocidad.
  useEffect(() => {
    rateRef.current = rate;
    if (isAudio) {
      player.setPlaybackRate(rate);
    } else if (ttsPlaying) {
      speakFrom(ttsIndex); // la voz del sistema solo cambia de velocidad al reiniciar el párrafo
    }
    // Solo reaccionar al cambio de velocidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  // Contar tiempo escuchado.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => onTickRef.current?.(TICK_SEC), TICK_SEC * 1000);
    return () => clearInterval(timer);
  }, [playing]);

  // Al salir de la pantalla, callar la voz del teléfono.
  useEffect(() => () => {
    generation.current++;
    Speech.stop();
  }, []);

  const play = useCallback(() => {
    if (isAudio) {
      // Si está antes del inicio del texto (por ejemplo al repetir), se salta la presentación.
      const d = status.duration;
      if (textStart > 0 && d && status.currentTime < textStart * d - 1) player.seekTo(textStart * d);
      // Si ya terminó el texto, vuelve a empezar desde el comienzo del texto.
      else if (d && textEnd < 1 && status.currentTime >= textEnd * d - 1) player.seekTo(textStart * d);
      player.play();
    }
    else speakFrom(ttsIndex);
  }, [isAudio, player, speakFrom, ttsIndex, textStart, textEnd, status.duration, status.currentTime]);

  const pause = useCallback(() => {
    if (isAudio) player.pause();
    else stopTts();
  }, [isAudio, player, stopTts]);

  const goTo = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(paragraphs.length - 1, i));
      if (isAudio) {
        if (status.duration) player.seekTo(boundaries[target] * status.duration);
        player.play();
      } else {
        speakFrom(target);
      }
    },
    [isAudio, paragraphs.length, status.duration, boundaries, player, speakFrom]
  );

  const progress = isAudio
    ? status.duration
      ? status.currentTime / status.duration
      : 0
    : paragraphs.length
      ? ttsIndex / paragraphs.length
      : 0;

  return {
    index,
    playing,
    progress,
    loading: isAudio && !status.isLoaded,
    /** La voz del teléfono no pudo leer (sin voces en español, texto no válido…). */
    speechFailed: ttsFailed,
    play,
    pause,
    toggle: playing ? pause : play,
    goTo,
    next: () => goTo(index + 1),
    previous: () => goTo(index - 1),
  };
}
