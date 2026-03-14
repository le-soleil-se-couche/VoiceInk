import logger from "./logger";
import { getSettings } from "../stores/settingsStore";

const START_NOTES = [523.25, 659.25];
const STOP_NOTES = [587.33, 523.25, 440];
const NOTE_DURATION_SECONDS = 0.09;
const NOTE_GAP_SECONDS = 0.025;
const NOTE_ATTACK_SECONDS = 0.015;
const STOP_NOTE_DURATION_SECONDS = 0.12;
const STOP_NOTE_GAP_SECONDS = 0.04;
const MAX_GAIN = 0.2;
const MIN_GAIN = 0.0001;

let audioContext = null;

const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
};

export const resumeContextIfNeeded = async () => {
  try {
    const context = getAudioContext();
    if (!context) {
      return null;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    return context.state === "running" ? context : null;
  } catch (error) {
    logger.debug(
      "Failed to initialize dictation cue audio context",
      { error: error instanceof Error ? error.message : String(error) },
      "audio"
    );
    return null;
  }
};

const scheduleTone = (context, frequency, startTime, noteDuration = NOTE_DURATION_SECONDS) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const stopTime = startTime + noteDuration;
  const attackDuration = Math.min(NOTE_ATTACK_SECONDS, noteDuration * 0.35);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(MIN_GAIN, startTime);
  gainNode.gain.linearRampToValueAtTime(MAX_GAIN, startTime + attackDuration);
  gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, stopTime);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(stopTime + 0.01);
};

const isEnabled = () => getSettings().audioCuesEnabled;

const playCue = async (notes, options = {}) => {
  try {
    if (!isEnabled()) return;

    const context = await resumeContextIfNeeded();
    if (!context) {
      return;
    }

    const noteDuration = options.noteDuration ?? NOTE_DURATION_SECONDS;
    const noteGap = options.noteGap ?? NOTE_GAP_SECONDS;
    const baseTime = context.currentTime + 0.005;
    notes.forEach((frequency, index) => {
      const noteStart = baseTime + index * (noteDuration + noteGap);
      scheduleTone(context, frequency, noteStart, noteDuration);
    });
  } catch (error) {
    logger.debug(
      "Failed to play dictation cue",
      { error: error instanceof Error ? error.message : String(error) },
      "audio"
    );
  }
};

export const playStartCue = () => playCue(START_NOTES);

export const playStopCue = () =>
  playCue(STOP_NOTES, {
    noteDuration: STOP_NOTE_DURATION_SECONDS,
    noteGap: STOP_NOTE_GAP_SECONDS,
  });
