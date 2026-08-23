import { APP_STATES } from './createMetronomadData.js';
import { clampBpm, clampCountIn, clampOffset, BPM_DEFAULT, COUNT_IN_DEFAULT } from '../Utils/paramClamps.js';
import { formatTime, parseOffsetInput } from '../Utils/timeFormat.js';
import { ENGINE_STATES, SCHEDULER } from '../Playback/playbackEngine.js';

/**
 * createMetronomadMethods — Vue instance-method factory for Metronomad.
 *
 * Non-reactive handles (set in createMetronomadLifecycle.mounted or by the
 * file-loading path, never bound in the template):
 *   _engine       — createPlaybackEngine instance (V-01/V-02)
 *   _fileLoader   — createFileLoader instance (V-05)
 *   _buffer       — decoded AudioBuffer of the loaded song (V-01 input)
 *   _lastValidBpm / _lastValidCountIn — restored when an input is cleared
 *   (V-03; lazy-initialized from BPM_DEFAULT/COUNT_IN_DEFAULT)
 *
 * Vue binds `this` to the component instance for every method.
 */

export function createMetronomadMethods() {
    return {
        // --- Drag & drop (U-13: drops rejected while audio runs) ---
        onDragOver() {
            this.isDragOver = true;
        },
        onDragLeave() {
            this.isDragOver = false;
        },
        onDrop(event) {
            this.isDragOver = false;
            const files = event && event.dataTransfer && event.dataTransfer.files;
            const file = files && files[0];
            if (!file) return;
            this.onFileDropped(file); // all acceptance guards live in the choke point (R-I1)
        },

        // --- Browse / file input ---
        onBrowseClick() {
            const input = document.getElementById('fileInput');
            if (input) input.click();
        },
        onFileInputChange(event) {
            const input = event && event.target;
            const file = input && input.files && input.files[0];
            if (input) input.value = ''; // allow re-selecting the same file
            if (file) this.onFileDropped(file);
        },

        // --- File loading (V-05: decoding false on ALL paths; errors are
        // non-blocking overlays — the app keeps its last valid state, D8) ---
        // U-13/R-I1: single file-acceptance choke point for drop AND
        // browse. Guard order (RD-2): param-lock first (friendly message),
        // then single-flight decode — silent no-op (R-I2). loadFile emits
        // 'decoding' synchronously before its first await (fileLoader.js),
        // so the flag is visible to any same-tick or later drop event.
        async onFileDropped(file) {
            const loader = this._fileLoader;
            if (!loader) return;

            if (this.isParamLocked) {
                this.errorMessage = 'Drop a new song after stopping';
                return;
            }
            if (this.decoding.active) return; // I-2: a decode is already in flight

            try {
                const result = await loader.loadFile(file);
                if (result.ok) {
                    this.fileName = result.fileName;
                    this.duration = result.duration;
                    this._buffer = result.buffer; // non-reactive engine input (V-01)
                    // The new song may be shorter than the current offset —
                    // clamp so a later Play can never start past the end.
                    this.offset = clampOffset(this.offset, result.duration);
                    this.offsetText = formatTime(this.offset);
                    this.appState = APP_STATES.READY;
                    this.errorMessage = ''; // U-16: prior error cleared
                    this.announcement = `${result.fileName} loaded`;
                } else {
                    // U-14/U-15/U-20: friendly message, appState unchanged.
                    this.errorMessage = result.message || 'Couldn\'t load that file';
                }
            } catch (err) {
                console.error('Metronomad file load failed:', err);
                this.errorMessage = 'Something went wrong loading that file';
            } finally {
                this.decoding = { active: false, fileName: '' };
            }
        },

        // --- Parameters (Phase 5) ---
        // V-03: parse a numeric control input. Returns { value, clamped },
        // or null for empty/non-numeric (callers restore the last valid value).
        _parseParamInput(rawValue, clamp) {
            const text = (rawValue === null || rawValue === undefined) ? '' : String(rawValue).trim();
            if (text === '') return null;
            const parsed = Number(text);
            if (!Number.isFinite(parsed)) return null;
            const value = clamp(parsed);
            return { value, clamped: value !== parsed };
        },

        // V-03/C-1 (RD-1, N-16): restore the last valid value for a param
        // whose entry was empty/non-numeric on commit. One helper for both
        // inputs; the draft re-syncs to the restored model so the field and
        // model never diverge (U-11 rev).
        _restoreLastValid(kind) {
            if (kind === 'bpm') {
                const last = Number.isFinite(this._lastValidBpm) ? this._lastValidBpm : BPM_DEFAULT;
                this.bpm = last;
                this._lastValidBpm = last;
                this.bpmText = String(last);
                this.bpmClamped = false;
            } else {
                const last = Number.isFinite(this._lastValidCountIn) ? this._lastValidCountIn : COUNT_IN_DEFAULT;
                this.countInBeats = last;
                this._lastValidCountIn = last;
                this.countInText = String(last);
                this.countInClamped = false;
            }
        },

        // C-1 (RD-1): BPM commits only on Enter/blur — the per-keystroke
        // clamp is deleted; the draft (bpmText) absorbs typing freely and
        // the model moves here. A clamped commit reverts the draft to the
        // committed display and surfaces the hint (U-11 rev).
        commitBpmEntry() {
            const result = this._parseParamInput(this.bpmText, clampBpm);
            if (result === null) { this._restoreLastValid('bpm'); return; }
            this.bpm = result.value;
            this._lastValidBpm = result.value;
            this.bpmText = String(result.value);
            this.bpmClamped = result.clamped;
        },

        onBpmStep(delta) {
            const raw = this.bpm + delta;
            const next = clampBpm(raw);
            this.bpm = next;
            this.bpmText = String(next); // sync the draft (R-C1.4)
            this.bpmClamped = next !== raw;
            this._lastValidBpm = next;
        },

        // C-1 (RD-1): count-in commits only on Enter/blur; the draft
        // (countInText) absorbs typing. N-20: a clamped commit surfaces the
        // "Count-in limited to 1–16" hint.
        commitCountInEntry() {
            const result = this._parseParamInput(this.countInText, clampCountIn);
            if (result === null) { this._restoreLastValid('countIn'); return; }
            this.countInBeats = result.value;
            this._lastValidCountIn = result.value;
            this.countInText = String(result.value);
            this.countInClamped = result.clamped;
        },

        // U-10: scrubber input → offset + offsetText (the field mirrors the
        // slider; the scrubber's own range already keeps values in [0, max],
        // so clamp only quantizes to the display precision).
        onOffsetScrub(rawValue) {
            const parsed = Number(rawValue);
            if (!Number.isFinite(parsed)) return;
            const value = clampOffset(parsed, this.duration);
            this.offset = value;
            this.offsetText = formatTime(value);
            this.offsetClamped = false;
            this.offsetHint = '';
        },

        // Template-facing wrapper (Enter/blur) — the testable contract is
        // commitOffsetEntry (V-04).
        onOffsetCommit() {
            this.commitOffsetEntry(this.offsetText);
        },

        // V-04: parse mm:ss.t (or bare seconds), clamp to [0, duration],
        // sync the text field to the committed value, and surface a hint.
        commitOffsetEntry(rawValue) {
            const parsed = parseOffsetInput(rawValue);
            if (parsed === null) {
                // Invalid entry: keep the offset, revert the field, hint.
                this.offsetText = formatTime(this.offset);
                this.offsetClamped = true;
                this.offsetHint = 'Enter the time as mm:ss.t';
                return;
            }
            const value = clampOffset(parsed, this.duration);
            this.offset = value;
            this.offsetText = formatTime(value);
            if (value !== parsed) {
                this.offsetClamped = true;
                this.offsetHint = 'Offset limited to song length';
            } else {
                this.offsetClamped = false;
                this.offsetHint = '';
            }
        },

        // --- Playback (Phase 5) ---
        // V-01: one button, one concern — run audio → stop it, idle → start
        // the count-in/song sequence with the current controls (spec §14.5).
        // Async: the idle path may wait on a context resume (U-19/D10);
        // the stop path and the running-context path complete synchronously.
        async onPlayToggle() {
            if (this.isParamLocked) {
                this._engine.stop();
                this._refocusPlayStopButton(); // U-04: focus returns to the toggle
                return;
            }
            if (!this.isReady) return;

            // D10: the context can be suspended (autoplay policy — no user
            // gesture reached it yet). Attempt resume before scheduling;
            // if it never settles within RESUME_TIMEOUT_MS, fail friendly
            // instead of leaving a dead button (U-19).
            const ctx = this._clock;
            if (ctx && ctx.state !== 'running') {
                const resumed = await this._resumeWithTimeout(ctx);
                if (!resumed) {
                    this.errorMessage = 'Audio is blocked by the browser — tap again to enable sound';
                    return;
                }
            }

            const result = this._engine.startSequence(this._sequenceParams());
            if (!result || !result.ok) {
                // P-13 defense-in-depth — the UI already clamps, so this is a
                // last-resort guard, not a reachable error path.
                this.errorMessage = "Couldn't start playback";
            }
        },

        // V-02: Restart only applies to the count-in/song sequence
        // (spec §6, KB-5) — it stays disabled during preview and when idle.
        onRestart() {
            if (!this.isSequenceRunning) return;
            const result = this._engine.restart(this._sequenceParams());
            if (!result || !result.ok) {
                this.errorMessage = "Couldn't restart playback";
                return;
            }
            this._refocusPlayStopButton(); // V-02: refocus after Stop/Restart
        },

        // resolve(true) when resume() settles, false on rejection or when it
        // does not settle within SCHEDULER.RESUME_TIMEOUT_MS.
        _resumeWithTimeout(ctx) {
            return new Promise((resolve) => {
                const timer = setTimeout(() => resolve(false), SCHEDULER.RESUME_TIMEOUT_MS);
                Promise.resolve(ctx.resume())
                    .then(() => { clearTimeout(timer); resolve(true); })
                    .catch(() => { clearTimeout(timer); resolve(false); });
            });
        },

        // The parameter bundle the engine needs for a sequence (V-01/V-02).
        _sequenceParams() {
            return {
                buffer: this._buffer,
                bpm: this.bpm,
                countInBeats: this.countInBeats,
                offset: this.offset
            };
        },

        // U-04/V-02: refocus the Play/Stop button after Stop or Restart
        // ($nextTick so the DOM has settled; state guard: never focus a
        // disabled button).
        _refocusPlayStopButton() {
            this.$nextTick(() => {
                const btn = this.$refs && this.$refs.playStopBtn;
                if (btn && !btn.disabled) btn.focus();
            });
        },

        // U-08: 3 s preview from the offset — no clicks, no count-in. The
        // engine clamps to the song end (D2) and never accepts ≤ 0 remainders.
        onPreview() {
            if (!this.isReady || this.isParamLocked) return;
            const result = this._engine.preview({
                buffer: this._buffer,
                offset: this.offset
            });
            if (!result || !result.ok) {
                this.errorMessage = "Can't preview from that position";
            }
        },

        // --- Beat dots / progress visualizer (Phase 6) ---
        // The visual clock runs for the count-in/song sequence only: it
        // starts on countingIn, keeps running through the playing flip
        // (one sequence, one loop), and stops on every terminal state.
        _startBeatDots() {
            if (this._beatDots) this._beatDots.startVisualClock();
        },

        _stopBeatDots() {
            if (this._beatDots) this._beatDots.stopVisualClock();
        },

        // document visibilitychange (listener wired in mounted): the RAF
        // loop pauses while hidden and snaps back on return (U-17, B-02).
        onVisibilityChange() {
            if (this._beatDots) this._beatDots.onVisibilityChange();
        },

        // --- Engine callbacks (injected in mounted) ---
        // V-07: the engine's onStateChange events (Phase 4 contract:
        // 'countingIn'/'playing'/'preview'/'stopped'/'ended'/'previewEnded')
        // map to appState + live-region announcements (polite region).
        onEngineStateChange(state) {
            switch (state) {
                case ENGINE_STATES.COUNTING_IN:
                    this.appState = APP_STATES.COUNTING_IN;
                    this.announcement = 'Count-in started';
                    this._startBeatDots();
                    break;
                case ENGINE_STATES.PLAYING:
                    this.appState = APP_STATES.PLAYING;
                    this.announcement = 'Song started';
                    // The visual loop keeps running — the song downbeat is
                    // on the same beat grid (D9); do not restart it.
                    break;
                case ENGINE_STATES.PREVIEW:
                    this.isPreviewing = true; // appState stays 'ready'
                    this.announcement = 'Preview started';
                    break;
                case ENGINE_STATES.STOPPED:
                    this._stopBeatDots();
                    // I-4/U-09: user Stop during preview announces "Preview
                    // stopped" like the auto-end path. isPreviewing is still
                    // true here — read it BEFORE _returnToReady clears it.
                    const wasPreviewing = this.isPreviewing;
                    this._returnToReady(wasPreviewing ? 'Preview stopped' : 'Stopped');
                    break;
                // 'ended' / 'previewEnded' are terminal events, not states —
                // the engine emits exactly one of them per finished run. Both
                // settle into the same resting state (KB-4), so they share
                // _returnToReady (preview cannot leave appState non-ready).
                case 'ended':
                    this._stopBeatDots();
                    this._returnToReady('Song ended');
                    break;
                case 'previewEnded':
                    this._stopBeatDots();
                    this._returnToReady('Preview stopped');
                    break;
            }
        },

        // KB-4: ready is the resting state; position resets to the offset.
        _returnToReady(announcement) {
            if (this.fileName) this.appState = APP_STATES.READY;
            this.isPreviewing = false;
            this.songPosition = this.offset;
            this.announcement = announcement;
        },

        // D10/U-18: the engine self-stops when the context is interrupted
        // or suspended outside our own stop.
        onAudioInterrupted() {
            this.announcement = 'Audio was interrupted — press Play to try again';
        }
    };
}
