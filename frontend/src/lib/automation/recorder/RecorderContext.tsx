import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Recorder } from './recorder';
import { Player } from './player';
import * as api from './api';
import type {
  Automation, AutomationVariable, PlayerState, PlayerStepState, RecordedStep,
  RecorderState, StepRunStatus,
} from './types';

/* ----------------------------------------------------------------------
 *  Global recorder + player provider.
 *
 *  Mounted once at the root of the app. Renders the floating overlay
 *  whenever the recorder is active OR a playback is in progress, so the
 *  teacher can use the live ERP UI underneath either way.
 * ------------------------------------------------------------------- */

export interface RecorderContextValue {
  recorderState: RecorderState;
  playerState: PlayerState;
  /** Current automation being recorded or replayed (null when idle). */
  current: Automation | null;
  /** Latest recorded steps (during recording) or current automation steps (during play). */
  steps: RecordedStep[];
  variables: AutomationVariable[];
  /** Per-step playback state, keyed by step id. */
  playbackState: Record<string, PlayerStepState>;
  logs: Array<{ ts: string; level: 'info' | 'warn' | 'error'; message: string; stepId?: string }>;

  startRecording: (automation: Automation) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  /** Manually remove a step before save. */
  removeStep: (stepId: string) => void;

  /** Begin playback. If `upTo` is provided, plays only steps[0..upTo). */
  startPlayback: (automation: Automation, variables: Record<string, string>, upTo?: number) => Promise<void>;
  /** Re-record a single step: play to N-1, capture replacement, splice. */
  reRecordStep: (automation: Automation, stepIndex: number, variables: Record<string, string>) => Promise<void>;
  stopPlayback: () => void;
}

const Ctx = createContext<RecorderContextValue | null>(null);

export const useRecorder = (): RecorderContextValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRecorder must be used inside <RecorderProvider>');
  return v;
};

export const RecorderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [current, setCurrent] = useState<Automation | null>(null);
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [variables, setVariables] = useState<AutomationVariable[]>([]);
  const [playbackState, setPlaybackState] = useState<Record<string, PlayerStepState>>({});
  const [logs, setLogs] = useState<RecorderContextValue['logs']>([]);

  const recorderRef = useRef<Recorder | null>(null);
  const playerRef = useRef<Player | null>(null);
  const abortRef = useRef(false);
  const reRecordingForRef = useRef<number | null>(null);

  // Lazily create the singleton recorder. We don't want this constructed
  // until the user actually starts recording — keeps event listeners off
  // the document for everyone else.
  const ensureRecorder = useCallback((): Recorder => {
    if (!recorderRef.current) {
      recorderRef.current = new Recorder({
        onStep: (step) => {
          if (reRecordingForRef.current !== null) {
            // Re-record flow: replace the target step with this new one
            // and immediately stop. The next step capture would otherwise
            // pile up.
            const idx = reRecordingForRef.current;
            reRecordingForRef.current = null;
            setSteps(prev => {
              const next = [...prev];
              next[idx] = step;
              return next;
            });
            recorderRef.current?.stop();
            setRecorderState('idle');
          } else {
            setSteps(prev => [...prev, step]);
          }
        },
      });
    }
    return recorderRef.current;
  }, []);

  /* -------------------- recording -------------------- */

  const startRecording = useCallback((automation: Automation) => {
    setCurrent(automation);
    setSteps(automation.steps);
    setVariables(automation.variables);
    setPlaybackState({});
    setLogs([]);
    setPlayerState('idle');
    setRecorderState('recording');
    ensureRecorder().start();
  }, [ensureRecorder]);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause();
    setRecorderState('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume();
    setRecorderState('recording');
  }, []);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.stop();
    setRecorderState('idle');
    setCurrent(null);
    setSteps([]);
    setVariables([]);
    reRecordingForRef.current = null;
  }, []);

  const stopRecording = useCallback(async () => {
    recorderRef.current?.stop();
    setRecorderState('idle');
    if (!current) return;
    // Persist captured steps + variable declarations back to the server.
    try {
      const saved = await api.updateAutomation(current._id, {
        steps,
        variables,
        status: steps.length > 0 ? 'ready' : 'draft',
      });
      setCurrent(saved);
      toast.success(`Saved "${saved.name}" — ${steps.length} step${steps.length === 1 ? '' : 's'}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save automation';
      setLogs(prev => [...prev, { ts: new Date().toISOString(), level: 'error', message }]);
      toast.error(message);
    }
  }, [current, steps, variables]);

  const removeStep = useCallback((stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId));
  }, []);

  /* -------------------- playback -------------------- */

  const startPlayback = useCallback(async (
    automation: Automation,
    vars: Record<string, string>,
    upTo?: number,
  ) => {
    setCurrent(automation);
    setSteps(automation.steps);
    setVariables(automation.variables);
    setPlaybackState({});
    setLogs([]);
    setPlayerState('playing');
    abortRef.current = false;
    const startedAt = new Date().toISOString();

    playerRef.current = new Player({
      variables: vars,
      navigate: (path) => navigate(path),
      shouldAbort: () => abortRef.current,
      onStepUpdate: (u) => {
        setPlaybackState(prev => ({
          ...prev,
          [u.stepId]: {
            stepId: u.stepId,
            status: u.status,
            matchedSelectorKind: u.matchedSelectorKind,
            errorMessage: u.errorMessage,
          },
        }));
      },
      onLog: (l) => setLogs(prev => [...prev, { ts: new Date().toISOString(), ...l }]),
    });

    const end = upTo ?? automation.steps.length;
    const { ok, results } = await playerRef.current.run(automation.steps, 0, end);
    setPlayerState(ok ? 'success' : 'failed');

    // Only record + toast the run when playing the whole automation.
    if (upTo === undefined) {
      if (ok) toast.success(`Ran "${automation.name}" successfully`);
      else {
        // Surface the actual reason from the first failed step.
        const failed = results.find(r => r.status === 'failed');
        const detail = failed?.errorMessage ? `: ${failed.errorMessage}` : '';
        toast.error(`Run failed${detail}`, { autoClose: 6000 });
      }
      try {
        await api.recordRun(automation._id, {
          status: ok ? 'success' : 'failed',
          variables: vars,
          stepResults: playerRef.current.getResults(),
          log: [],
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      } catch {
        /* non-fatal */
      }
    }
  }, [navigate]);

  const stopPlayback = useCallback(() => {
    abortRef.current = true;
    setPlayerState('idle');
  }, []);

  const reRecordStep = useCallback(async (
    automation: Automation,
    stepIndex: number,
    vars: Record<string, string>,
  ) => {
    setCurrent(automation);
    setSteps(automation.steps);
    setVariables(automation.variables);
    setPlaybackState({});
    setLogs([]);
    setPlayerState('playing');
    abortRef.current = false;

    // Play forward up to (but not including) stepIndex.
    playerRef.current = new Player({
      variables: vars,
      navigate: (path) => navigate(path),
      onStepUpdate: (u) => setPlaybackState(prev => ({
        ...prev,
        [u.stepId]: {
          stepId: u.stepId,
          status: u.status,
          matchedSelectorKind: u.matchedSelectorKind,
          errorMessage: u.errorMessage,
        },
      })),
      onLog: (l) => setLogs(prev => [...prev, { ts: new Date().toISOString(), ...l }]),
    });

    if (stepIndex > 0) {
      const { ok } = await playerRef.current.run(automation.steps, 0, stepIndex);
      if (!ok) {
        setPlayerState('failed');
        return;
      }
    }

    setPlayerState('idle');
    reRecordingForRef.current = stepIndex;
    setRecorderState('recording');
    ensureRecorder().start();
  }, [ensureRecorder, navigate]);

  /* -------------------- cleanup -------------------- */

  useEffect(() => () => {
    recorderRef.current?.stop();
    abortRef.current = true;
  }, []);

  const value = useMemo<RecorderContextValue>(() => ({
    recorderState, playerState, current, steps, variables, playbackState, logs,
    startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording, removeStep,
    startPlayback, stopPlayback, reRecordStep,
  }), [
    recorderState, playerState, current, steps, variables, playbackState, logs,
    startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording, removeStep,
    startPlayback, stopPlayback, reRecordStep,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/* Convenience exported types so consumers can refer to them. */
export type { RecorderState, PlayerState, StepRunStatus };
