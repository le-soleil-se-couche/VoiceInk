import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./index.css";
import { X, Mic } from "lucide-react";
import { useToast } from "./components/ui/Toast";
import { useHotkey } from "./hooks/useHotkey";
import { useWindowDrag } from "./hooks/useWindowDrag";
import { useAudioRecording } from "./hooks/useAudioRecording";
import { useSettingsStore } from "./stores/settingsStore";
import { formatHotkeyLabel } from "./utils/hotkeys";

// Recording waveform — pure CSS, 5 bars, uses existing waveform-bar keyframe
const RecordingWave = () => (
  <div className="flex items-end gap-px justify-center" style={{ height: 14 }}>
    {[7, 11, 14, 11, 7].map((h, i) => (
      <div
        key={i}
        className="w-[3px] rounded-full bg-white origin-bottom"
        style={{
          height: h,
          animation: `waveform-bar ${0.5 + i * 0.06}s ease-in-out infinite`,
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
  </div>
);

// Processing arc — rotating SVG arc, uses existing spinner-rotate keyframe
const ProcessingArc = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className="animate-[spinner-rotate_0.9s_linear_infinite]"
  >
    <circle
      cx="9"
      cy="9"
      r="6.5"
      fill="none"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeDasharray="18 23"
      stroke="url(#voiceink-arc-grad)"
    />
    <defs>
      <linearGradient id="voiceink-arc-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="white" stopOpacity="0.95" />
        <stop offset="100%" stopColor="white" stopOpacity="0.15" />
      </linearGradient>
    </defs>
  </svg>
);

// Enhanced Tooltip Component
const Tooltip = ({ children, content, emoji }) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    left: 0,
    top: 0,
    arrowLeft: "50%",
  });

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const updatePosition = () => {
      const triggerEl = triggerRef.current;
      const tooltipEl = tooltipRef.current;

      if (!triggerEl || !tooltipEl) {
        return;
      }

      const margin = 2;
      const triggerRect = triggerEl.getBoundingClientRect();
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      const centeredLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      const maxLeft = Math.max(margin, viewportWidth - tooltipRect.width - margin);
      const left = Math.min(Math.max(centeredLeft, margin), maxLeft);
      const top = Math.max(margin, triggerRect.top - tooltipRect.height - margin);
      const arrowLeftPx = Math.min(
        Math.max(triggerRect.left + triggerRect.width / 2 - left, 10),
        tooltipRect.width - 10
      );

      setTooltipPosition({
        left,
        top,
        arrowLeft: `${arrowLeftPx}px`,
      });
    };

    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible, content]);

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed px-1.5 py-1 text-popover-foreground bg-popover border border-border rounded-md z-10 transition-opacity duration-150 shadow-lg font-medium"
          style={{
            fontSize: "9.4px",
            whiteSpace: "nowrap",
            maxWidth: "calc(100vw - 4px)",
            left: `${tooltipPosition.left}px`,
            top: `${tooltipPosition.top}px`,
          }}
        >
          {emoji && <span className="mr-1">{emoji}</span>}
          {content}
          <div
            className="absolute top-full w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-popover"
            style={{ left: tooltipPosition.arrowLeft, transform: "translateX(-50%)" }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isHovered, setIsHovered] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const commandMenuRef = useRef(null);
  const buttonRef = useRef(null);
  const { toast, dismiss, toastCount } = useToast();
  const { t } = useTranslation();
  const { hotkey } = useHotkey();
  const { isDragging, handleMouseDown, handleMouseUp } = useWindowDrag();

  const [dragStartPos, setDragStartPos] = useState(null);
  const [hasDragged, setHasDragged] = useState(false);

  // Floating icon auto-hide setting (read from store, synced via IPC)
  const floatingIconAutoHide = useSettingsStore((s) => s.floatingIconAutoHide);
  const prevAutoHideRef = useRef(floatingIconAutoHide);

  const setWindowInteractivity = React.useCallback((shouldCapture) => {
    window.electronAPI?.setMainWindowInteractivity?.(shouldCapture);
  }, []);

  useEffect(() => {
    setWindowInteractivity(false);
    return () => setWindowInteractivity(false);
  }, [setWindowInteractivity]);

  // Flush any pending transcriptions from previous session (crash recovery)
  useEffect(() => {
    const flushPending = async () => {
      try {
        // Import AudioManager dynamically to access pending transcription methods
        const AudioManagerModule = await import('./helpers/audioManager');
        const AudioManager = AudioManagerModule.default;
        // Create a temporary instance just to access the flush method
        const tempInstance = new AudioManager();
        const result = await tempInstance.flushPendingTranscriptions();
        if (result.flushed > 0) {
          toast({
            title: t("app.persistence.recoveredTitle", { count: result.flushed }),
            description: t("app.persistence.recoveredDescription", { count: result.flushed }),
            variant: "default",
            duration: 5000,
          });
        }
      } catch (error) {
        // Silently fail - pending transcriptions will retry on next app start
        console.error("Failed to flush pending transcriptions:", error);
      }
    };
    flushPending();
  }, [toast, t]);

  useEffect(() => {
    const unsubscribeFallback = window.electronAPI?.onHotkeyFallbackUsed?.((data) => {
      const fallbackHotkey = typeof data?.fallback === "string" ? data.fallback.trim() : "";
      if (fallbackHotkey) {
        localStorage.setItem("dictationKey", fallbackHotkey);
        if (useSettingsStore.getState().dictationKey !== fallbackHotkey) {
          useSettingsStore.setState({ dictationKey: fallbackHotkey });
        }
      }

      toast({
        title: t("app.toasts.hotkeyChanged.title"),
        description: data.message,
        duration: 8000,
      });
    });

    const unsubscribeFailed = window.electronAPI?.onHotkeyRegistrationFailed?.((_data) => {
      toast({
        title: t("app.toasts.hotkeyUnavailable.title"),
        description: t("app.toasts.hotkeyUnavailable.description"),
        duration: 10000,
      });
    });

    const unsubscribeCorrections = window.electronAPI?.onCorrectionsLearned?.((words) => {
      if (words && words.length > 0) {
        const wordList = words.map((w) => `\u201c${w}\u201d`).join(", ");
        let toastId;
        toastId = toast({
          title: t("app.toasts.addedToDict", { words: wordList }),
          variant: "success",
          duration: 6000,
          action: (
            <button
              onClick={async () => {
                try {
                  const result = await window.electronAPI?.undoLearnedCorrections?.(words);
                  if (result?.success) {
                    dismiss(toastId);
                  }
                } catch {
                  // silently fail — word stays in dictionary
                }
              }}
              className="text-[10px] font-medium px-2.5 py-1 rounded-sm whitespace-nowrap
                text-emerald-100/90 hover:text-white
                bg-emerald-500/15 hover:bg-emerald-500/25
                border border-emerald-400/20 hover:border-emerald-400/35
                transition-all duration-150"
            >
              {t("app.toasts.undo")}
            </button>
          ),
        });
      }
    });

    return () => {
      unsubscribeFallback?.();
      unsubscribeFailed?.();
      unsubscribeCorrections?.();
    };
  }, [toast, dismiss, t]);

  useEffect(() => {
    if (isCommandMenuOpen || toastCount > 0) {
      setWindowInteractivity(true);
    } else if (!isHovered) {
      setWindowInteractivity(false);
    }
  }, [isCommandMenuOpen, isHovered, toastCount, setWindowInteractivity]);

  useEffect(() => {
    const resizeWindow = () => {
      if (isCommandMenuOpen && toastCount > 0) {
        window.electronAPI?.resizeMainWindow?.("EXPANDED");
      } else if (isCommandMenuOpen) {
        window.electronAPI?.resizeMainWindow?.("WITH_MENU");
      } else if (toastCount > 0) {
        window.electronAPI?.resizeMainWindow?.("WITH_TOAST");
      } else {
        window.electronAPI?.resizeMainWindow?.("BASE");
      }
    };
    resizeWindow();
  }, [isCommandMenuOpen, toastCount]);

  const handleDictationToggle = React.useCallback(() => {
    setIsCommandMenuOpen(false);
    setWindowInteractivity(false);
  }, [setWindowInteractivity]);

  const { isRecording, isProcessing, toggleListening, cancelRecording, cancelProcessing } =
    useAudioRecording(toast, {
      onToggle: handleDictationToggle,
      dismiss,
    });

  // Visual-only animation states for button transitions
  const [isEnteringRecord, setIsEnteringRecord] = useState(false);
  const [isTransitioningToProcess, setIsTransitioningToProcess] = useState(false);
  const prevIsRecordingRef = useRef(false);
  const prevIsProcessingRef = useRef(false);

  useEffect(() => {
    if (isRecording && !prevIsRecordingRef.current) {
      setIsEnteringRecord(true);
      const timer = setTimeout(() => setIsEnteringRecord(false), 300);
      prevIsRecordingRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isRecording) prevIsRecordingRef.current = false;
  }, [isRecording]);

  useEffect(() => {
    if (isProcessing && !prevIsProcessingRef.current) {
      setIsTransitioningToProcess(true);
      const timer = setTimeout(() => setIsTransitioningToProcess(false), 350);
      prevIsProcessingRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isProcessing) prevIsProcessingRef.current = false;
  }, [isProcessing]);

  // Sync auto-hide from main process — setState directly to avoid IPC echo
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onFloatingIconAutoHideChanged?.((enabled) => {
      localStorage.setItem("floatingIconAutoHide", String(enabled));
      useSettingsStore.setState({ floatingIconAutoHide: enabled });
    });
    return () => unsubscribe?.();
  }, []);

  // Auto-hide the floating icon when idle (setting enabled or dictation cycle completed)
  useEffect(() => {
    let hideTimeout;

    if (floatingIconAutoHide && !isRecording && !isProcessing && toastCount === 0) {
      // Delay briefly so processing can start after recording stops without a flash
      hideTimeout = setTimeout(() => {
        window.electronAPI?.hideWindow?.();
      }, 500);
    } else if (!floatingIconAutoHide && prevAutoHideRef.current) {
      window.electronAPI?.showDictationPanel?.();
    }

    prevAutoHideRef.current = floatingIconAutoHide;
    return () => clearTimeout(hideTimeout);
  }, [isRecording, isProcessing, floatingIconAutoHide, toastCount]);

  const handleClose = () => {
    window.electronAPI.hideWindow();
  };

  useEffect(() => {
    if (!isCommandMenuOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (
        commandMenuRef.current &&
        !commandMenuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsCommandMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCommandMenuOpen]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        if (isCommandMenuOpen) {
          setIsCommandMenuOpen(false);
        } else {
          handleClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [isCommandMenuOpen]);

  // Determine current mic state
  const getMicState = () => {
    if (isRecording) return "recording";
    if (isProcessing) return "processing";
    if (isHovered && !isRecording && !isProcessing) return "hover";
    return "idle";
  };

  const micState = getMicState();
  const hotkeyLabel = formatHotkeyLabel(hotkey);

  const getMicButtonProps = () => {
    switch (micState) {
      case "recording":
        return { tooltip: t("app.mic.recording") };
      case "processing":
        return { tooltip: t("app.mic.processing") };
      default:
        return { tooltip: hotkeyLabel };
    }
  };

  const micProps = getMicButtonProps();

  const getButtonScale = () => {
    if (isEnteringRecord) return "scale(1.10)";
    if (isTransitioningToProcess) return "scale(0.90)";
    if (micState === "hover") return "scale(1.08)";
    return "scale(1)";
  };

  const getButtonGlow = () => {
    const base =
      "0 8px 32px oklch(0 0 0 / 0.45), inset 0 1px 0 rgba(255,255,255,0.10)";
    if (micState === "hover")
      return `${base}, 0 0 16px oklch(0.65 0.2 260 / 0.40)`;
    if (micState === "recording")
      return `${base}, 0 0 20px oklch(0.65 0.2 260 / 0.55)`;
    if (micState === "processing")
      return `${base}, 0 0 18px oklch(0.68 0.18 285 / 0.45)`;
    return base;
  };

  const getStateTint = () => {
    if (micState === "recording") return "oklch(0.40 0.14 260 / 0.80)";
    if (micState === "processing") return "oklch(0.38 0.12 285 / 0.80)";
    if (micState === "hover") return "oklch(0.25 0.04 260 / 0.60)";
    return "oklch(0.15 0.012 260 / 0.55)";
  };

  const getAmbientGlow = () => {
    if (micState === "recording") return "radial-gradient(circle, oklch(0.65 0.2 260 / 0.55) 0%, transparent 68%)";
    if (micState === "processing") return "radial-gradient(circle, oklch(0.68 0.18 285 / 0.50) 0%, transparent 68%)";
    if (micState === "hover") return "radial-gradient(circle, oklch(0.65 0.2 260 / 0.30) 0%, transparent 68%)";
    return "transparent";
  };

  return (
    <div className="dictation-window">
      {/* Bottom-right voice button - window expands upward/leftward */}
      <div className="fixed bottom-6 right-6 z-50">
        <div
          className="relative flex items-center gap-2"
          onMouseEnter={() => {
            setIsHovered(true);
            setWindowInteractivity(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            if (!isCommandMenuOpen) {
              setWindowInteractivity(false);
            }
          }}
        >
          {(isRecording || isProcessing) && isHovered && (
            <button
              aria-label={
                isRecording ? t("app.buttons.cancelRecording") : t("app.buttons.cancelProcessing")
              }
              onClick={(e) => {
                e.stopPropagation();
                isRecording ? cancelRecording() : cancelProcessing();
              }}
              className="group/cancel w-5 h-5 rounded-full bg-surface-2/90 hover:bg-destructive border border-border hover:border-destructive/70 flex items-center justify-center transition-colors duration-150 shadow-sm backdrop-blur-sm"
            >
              <X
                size={10}
                strokeWidth={2.5}
                className="text-foreground group-hover/cancel:text-destructive-foreground transition-colors duration-150"
              />
            </button>
          )}
          <Tooltip content={micProps.tooltip}>
            <div className="relative">
              {/* Ambient glow — behind button, z-index -1 */}
              <div
                className="absolute rounded-full blur-lg pointer-events-none transition-all duration-500"
                style={{
                  inset: "-6px",
                  zIndex: -1,
                  background: getAmbientGlow(),
                  opacity: micState === "idle" ? 0 : 1,
                }}
              />

              {/* Recording ripple waves — outside button, expands freely */}
              {micState === "recording" && (
                <>
                  <div className="absolute inset-0 rounded-full border border-primary/55 animate-[btn-ring-expand_1.7s_ease-out_infinite] pointer-events-none" />
                  <div className="absolute inset-0 rounded-full border border-primary/35 animate-[btn-ring-expand_1.7s_ease-out_0.57s_infinite] pointer-events-none" />
                  <div className="absolute inset-0 rounded-full border border-primary/18 animate-[btn-ring-expand_1.7s_ease-out_1.13s_infinite] pointer-events-none" />
                </>
              )}

              {/* Processing conic ring — outside button (needs overflow:visible) */}
              {micState === "processing" && (
                <div
                  className="absolute rounded-full pointer-events-none animate-[spinner-rotate_2s_linear_infinite]"
                  style={{
                    inset: "-2px",
                    background:
                      "conic-gradient(from 0deg, transparent 0%, oklch(0.65 0.2 260 / 0.55) 30%, oklch(0.68 0.18 285 / 0.9) 60%, transparent 100%)",
                    WebkitMask:
                      "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff 0)",
                    mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff 0)",
                  }}
                />
              )}

              <button
                ref={buttonRef}
                onMouseDown={(e) => {
                  setIsCommandMenuOpen(false);
                  setDragStartPos({ x: e.clientX, y: e.clientY });
                  setHasDragged(false);
                  handleMouseDown(e);
                }}
                onMouseMove={(e) => {
                  if (dragStartPos && !hasDragged) {
                    const distance = Math.sqrt(
                      Math.pow(e.clientX - dragStartPos.x, 2) +
                        Math.pow(e.clientY - dragStartPos.y, 2)
                    );
                    if (distance > 5) {
                      // 5px threshold for drag
                      setHasDragged(true);
                    }
                  }
                }}
                onMouseUp={(e) => {
                  handleMouseUp(e);
                  setDragStartPos(null);
                }}
                onClick={(e) => {
                  if (!hasDragged) {
                    setIsCommandMenuOpen(false);
                    toggleListening();
                  }
                  e.preventDefault();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!hasDragged) {
                    setWindowInteractivity(true);
                    setIsCommandMenuOpen((prev) => !prev);
                  }
                }}
                onFocus={() => setIsHovered(true)}
                onBlur={() => setIsHovered(false)}
                className={`rounded-full w-10 h-10 relative overflow-hidden ring-1 ring-inset ring-white/[0.18] flex items-center justify-center ${
                  micState === "processing" ? "cursor-not-allowed" : isDragging ? "cursor-grabbing" : "cursor-pointer"
                }`}
                style={{
                  transform: getButtonScale(),
                  boxShadow: getButtonGlow(),
                  transition:
                    "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease",
                }}
              >
                {/* State tint layer */}
                <div
                  className="absolute inset-0 rounded-full transition-[background] duration-300"
                  style={{ background: getStateTint() }}
                />

                {/* Glass highlight stripe */}
                <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {/* Icon layer */}
                <div className="relative z-10 flex items-center justify-center">
                  {micState === "idle" || micState === "hover" ? (
                    <Mic
                      size={15}
                      className={micState === "hover" ? "text-white/95" : "text-white/75"}
                      strokeWidth={1.5}
                    />
                  ) : micState === "recording" ? (
                    <RecordingWave />
                  ) : (
                    <ProcessingArc />
                  )}
                </div>

              </button>
            </div>
          </Tooltip>
          {isCommandMenuOpen && (
            <div
              ref={commandMenuRef}
              className="absolute bottom-full right-0 mb-3 w-48 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg backdrop-blur-sm"
              onMouseEnter={() => {
                setWindowInteractivity(true);
              }}
              onMouseLeave={() => {
                if (!isHovered) {
                  setWindowInteractivity(false);
                }
              }}
            >
              <button
                className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-muted focus:bg-muted focus:outline-none"
                onClick={() => {
                  toggleListening();
                }}
              >
                {isRecording
                  ? t("app.commandMenu.stopListening")
                  : t("app.commandMenu.startListening")}
              </button>
              <div className="h-px bg-border" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                onClick={() => {
                  setIsCommandMenuOpen(false);
                  setWindowInteractivity(false);
                  handleClose();
                }}
              >
                {t("app.commandMenu.hideForNow")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
