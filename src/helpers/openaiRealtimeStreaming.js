const WebSocket = require("ws");
const debugLogger = require("./debugLogger");

const WEBSOCKET_TIMEOUT_MS = 15000;
const DISCONNECT_TIMEOUT_MS = 3000;

class OpenAIRealtimeStreaming {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.completedSegments = [];
    this.currentPartial = "";
    this.onPartialTranscript = null;
    this.onFinalTranscript = null;
    this.onError = null;
    this.onSessionEnd = null;
    this.pendingResolve = null;
    this.pendingReject = null;
    this.connectionTimeout = null;
    this.closeResolve = null;
    this.isDisconnecting = false;
    this.audioBytesSent = 0;
    this.model = "gpt-4o-mini-transcribe";
  }

  getFullTranscript() {
    return this.completedSegments.join(" ");
  }

  async connect(options = {}) {
    const { apiKey, model, preconfigured } = options;
    if (!apiKey) throw new Error("OpenAI API key is required");

    if (this.isConnected) {
      debugLogger.debug("OpenAI Realtime already connected");
      return;
    }

    this.model = model || "gpt-4o-mini-transcribe";
    this.preconfigured = !!preconfigured;
    this.completedSegments = [];
    this.currentPartial = "";
    this.audioBytesSent = 0;

    const url = "wss://api.openai.com/v1/realtime?intent=transcription";
    debugLogger.debug("OpenAI Realtime connecting", { model: this.model });

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      this.connectionTimeout = setTimeout(() => {
        this.cleanup();
        reject(new Error("OpenAI Realtime connection timeout"));
      }, WEBSOCKET_TIMEOUT_MS);

      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      this.ws.on("open", () => {
        debugLogger.debug("OpenAI Realtime WebSocket opened");
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data);
      });

      this.ws.on("error", (error) => {
        debugLogger.error("OpenAI Realtime WebSocket error", { error: error.message });
        this.cleanup();
        if (this.pendingReject) {
          this.pendingReject(error);
          this.pendingReject = null;
          this.pendingResolve = null;
        }
        this.onError?.(error);
      });

      this.ws.on("close", (code, reason) => {
        const wasActive = this.isConnected;
        debugLogger.debug("OpenAI Realtime WebSocket closed", {
          code,
          reason: reason?.toString(),
          wasActive,
        });
        if (this.pendingReject) {
          this.pendingReject(new Error(`WebSocket closed before ready (code: ${code})`));
          this.pendingReject = null;
          this.pendingResolve = null;
        }
        if (this.closeResolve) {
          this.closeResolve({ text: this.getFullTranscript() });
        }
        this.cleanup();
        if (wasActive && !this.isDisconnecting) {
          this.onSessionEnd?.({ text: this.getFullTranscript() });
        }
      });
    });
  }

  handleMessage(data) {
    try {
      const event = JSON.parse(data.toString());

      switch (event.type) {
        case "transcription_session.created": {
          if (this.preconfigured) {
            // Server-side ephemeral token already configured the session;
            // sending an update would strip language and noise-reduction.
            debugLogger.debug("OpenAI Realtime session created (preconfigured)", {
              model: this.model,
            });
            this.isConnected = true;
            clearTimeout(this.connectionTimeout);
            if (this.pendingResolve) {
              this.pendingResolve();
              this.pendingResolve = null;
              this.pendingReject = null;
            }
          } else {
            debugLogger.debug("OpenAI Realtime session created, sending configuration", {
              model: this.model,
            });
            this.ws.send(
              JSON.stringify({
                type: "transcription_session.update",
                session: {
                  input_audio_format: "pcm16",
                  input_audio_transcription: {
                    model: this.model,
                  },
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    silence_duration_ms: 800,
                    prefix_padding_ms: 300,
                  },
                },
              })
            );
          }
          break;
        }

        case "transcription_session.updated": {
          if (this.pendingResolve) {
            this.isConnected = true;
            clearTimeout(this.connectionTimeout);
            debugLogger.debug("OpenAI Realtime session configured", {
              model: this.model,
            });
            this.pendingResolve();
            this.pendingResolve = null;
            this.pendingReject = null;
          }
          break;
        }

        case "conversation.item.input_audio_transcription.delta": {
          this.currentPartial += event.delta || "";
          this.onPartialTranscript?.(this.currentPartial);
          break;
        }

        case "conversation.item.input_audio_transcription.completed": {
          const transcript = (event.transcript || "").trim();
          if (transcript) {
            this.completedSegments.push(transcript);
          }
          this.currentPartial = "";
          const fullText = this.getFullTranscript();
          this.onFinalTranscript?.(fullText);
          debugLogger.debug("OpenAI Realtime turn completed", {
            turnText: transcript.slice(0, 100),
            totalLength: fullText.length,
            segments: this.completedSegments.length,
          });
          break;
        }

        case "input_audio_buffer.speech_started":
        case "input_audio_buffer.speech_stopped":
        case "input_audio_buffer.committed":
          break;

        case "error":
          debugLogger.error("OpenAI Realtime error event", {
            code: event.error?.code,
            message: event.error?.message,
          });
          this.onError?.(new Error(event.error?.message || "OpenAI Realtime error"));
          break;

        default:
          break;
      }
    } catch (err) {
      debugLogger.error("OpenAI Realtime message parse error", { error: err.message });
    }
  }

  sendAudio(pcmBuffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    const base64Audio = Buffer.from(pcmBuffer).toString("base64");
    this.ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64Audio }));
    this.audioBytesSent += pcmBuffer.length;
    return true;
  }

  async disconnect() {
    debugLogger.debug("OpenAI Realtime disconnect", {
      audioBytesSent: this.audioBytesSent,
      segments: this.completedSegments.length,
      textLength: this.getFullTranscript().length,
    });

    if (!this.ws) return { text: this.getFullTranscript() };

    this.isDisconnecting = true;

    if (this.ws.readyState === WebSocket.OPEN) {
      if (this.audioBytesSent > 0) {
        const prevOnFinal = this.onFinalTranscript;
        const prevOnError = this.onError;

        await new Promise((resolve) => {
          const tid = setTimeout(() => {
            debugLogger.debug("OpenAI Realtime commit timeout, using accumulated text");
            resolve();
          }, DISCONNECT_TIMEOUT_MS);

          const done = () => {
            clearTimeout(tid);
            this.onFinalTranscript = prevOnFinal;
            this.onError = prevOnError;
            resolve();
          };

          this.onFinalTranscript = (text) => {
            prevOnFinal?.(text);
            done();
          };

          // Server VAD may have already committed all audio, causing an
          // empty-buffer error. Resolve immediately instead of waiting for timeout.
          this.onError = (err) => {
            if (
              err?.message?.includes("buffer too small") ||
              err?.message?.includes("commit_empty")
            ) {
              done();
            } else {
              prevOnError?.(err);
            }
          };

          try {
            this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
          } catch {
            done();
          }
        });
      }

      this.ws.close();
    }

    const result = { text: this.getFullTranscript() };
    this.cleanup();
    this.isDisconnecting = false;
    return result;
  }

  cleanup() {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        // ignore
      }
      this.ws = null;
    }

    this.isConnected = false;
    this.closeResolve = null;
  }
}

module.exports = OpenAIRealtimeStreaming;
