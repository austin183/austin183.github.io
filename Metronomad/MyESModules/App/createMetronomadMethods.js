import { APP_STATES } from './createMetronomadData.js';
import { clampBpm, clampCountIn, clampOffset, clampEnd, MIN_SECTION_SEC, BPM_DEFAULT, COUNT_IN_DEFAULT } from '../Utils/paramClamps.js';
import { formatTime, parseOffsetInput } from '../Utils/timeFormat.js';
import { ENGINE_STATES, ENGINE_EVENTS, SCHEDULER } from '../Playback/playbackEngine.js';
import { extractPeaks } from '../Analysis/waveformPeaks.js';
import { channelArrays } from '../Analysis/channelData.js';
import { detectTempo } from '../Analysis/tempoDetection.js';
import { fileIdentityOf, entryMatches, addEntry, removeEntry, encode, newId } from '../Storage/savedLoops.js';

/**
 * createMetronomadMethods — Vue instance-method factory for Metronomad.
 *
 * Non-reactive handles (set in createMetronomadLifecycle.mounted or by the
 * file-loading path, never bound in the template):
 *   _engine       — createPlaybackEngine instance (V-01/V-02)
 *   _fileLoader   — createFileLoader instance (V-05)
 *   _buffer       — decoded AudioBuffer of the loaded song (V-01 input)
 *   _waveformView — createWaveformView instance (CR 001 Phase 4)
 *   _peaks        — extractPeaks result for the live buffer (Phase 4)
 *   _loadGeneration / _bpmTouchedThisFile / _disposed — D-E analysis
 *   guards (generation + buffer identity + unmount; Phase 6 flag)
 *   _lastValidBpm / _lastValidCountIn — restored when an input is cleared
 *   (V-03; lazy-initialized from BPM_DEFAULT/COUNT_IN_DEFAULT)
 *   _loopStorage        — createLocalStorageAdapter instance (CR 004, built
 *   in mounted; owns no listeners — beforeUnmount just nulls it)
 *   _liveFileIdentity   — { fileName, fileSize, fileLastModified } | null of
 *   the loaded file (CR 004 ok-branch; the Save record's identity source)
 *   _setupSavedHintTimer — the 3 s "Setup saved" auto-clear timer (CR 004;
 *   cleared in beforeUnmount)
 *
 * Vue binds `this` to the component instance for every method.
 */

export function createMetronomadMethods() {
    return {
        // --- Drag & drop (U-13: drops rejected while audio runs) ---
        onDragOver() {
            this.isDragOver = true;
        },
        onDragLeave(event) {
            // N-13: the drop zone contains the Browse button and file
            // input — the cursor crossing onto a CHILD fires dragleave
            // too, and clearing there caused the highlight to flicker
            // (and drop to fail, since the zone was no longer "armed").
            // A leave whose relatedTarget is still inside the zone is not
            // a leave. (pointer-events:none would have disabled the
            // children — rejected at scoping.)
            const related = event && event.relatedTarget;
            const zone = event && event.currentTarget;
            if (related && zone && zone.contains(related)) return;
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
                    // D-E: UI-side generation + buffer-identity guards. The
                    // failure paths below deliberately do NOT bump the
                    // generation — the old buffer stays live (F-05), so an
                    // in-flight analysis result for it remains valid (WF-I1.5).
                    this._loadGeneration = (this._loadGeneration || 0) + 1;
                    this._bpmTouchedThisFile = false; // CR §2.5 row 1: a re-drop re-suggests
                    this.tempoSuggestion = null;      // the previous file's hint dies with it (silence is per-file, W-13)
                    this.waveformReady = false;       // placeholder reappears (O-2/W-17)
                    // The new song may be shorter than the current offset —
                    // clamp so a later Play can never start past the end.
                    this.offset = clampOffset(this.offset, result.duration);
                    this.offsetText = formatTime(this.offset);
                    // CR 003 (EN-D14): the new song may make the section
                    // shorter or inexpressible — re-clamp AFTER the offset
                    // (clampEnd sees the new offset). A longer file whose
                    // end is still in range is a no-op. 2026-08-30: a
                    // re-clamp that lands ON the new song end is also
                    // "no section" (at-the-end ⇔ null) — the friendly
                    // hint covers both removals.
                    if (this.end !== null) {
                        this.end = clampEnd(this.end, this.offset, result.duration);
                        if (this.end < this.offset + MIN_SECTION_SEC || this._endAtSongEnd(this.end)) {
                            this.end = null;
                            this.endText = '';
                            this.endClamped = true;
                            this.endHint = 'Section end removed (song too short)';
                        } else {
                            this.endText = formatTime(this.end);
                            this.endClamped = false;
                            this.endHint = '';
                        }
                    }
                    const identity = fileIdentityOf(file); // null for metadata-less File objects
                    this._liveFileIdentity = identity;
                    this.restoreHint = ''; // the previous file's hint dies with it (per-file, W-13 shape)
                    this.matchedEntryIds = identity && this.savedLoopsAvailable
                        ? this.savedLoops.entries
                            .filter((e) => entryMatches(e, identity, result.duration))
                            .map((e) => e.id)
                        : [];
                    this.appState = APP_STATES.READY;
                    this.errorMessage = ''; // U-16: prior error cleared
                    // W-3: ONE live-region write per load. The pre-existing bare assignment
                    // becomes the zero-match branch (string verbatim — pre-existing rows untouched).
                    if (this.matchedEntryIds.length === 1 && this._draftsClean()) {
                        this.applySavedSetup(this.savedLoops.entries.find((e) => e.id === this.matchedEntryIds[0]));
                        this.restoreHint = 'Restored saved settings';
                        this.announcement = `${result.fileName} loaded — settings restored`;
                    } else if (this.matchedEntryIds.length > 0) {
                        this.announcement = `${result.fileName} loaded — choose a saved setup`;
                    } else {
                        this.announcement = `${result.fileName} loaded`;
                    }
                    // The single post-load hook (CR §3): BOTH async analysis
                    // tasks run after the READY paint, under the D4-style
                    // generation guard. Never delays the flip (W-6).
                    this._schedulePostLoadTasks(result.buffer, this._loadGeneration);
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

        // --- Post-load analysis tasks (CR 001 Phase 4, D-E) ---
        // The single shared hook point (CR §3). TWO-TASK SHAPE FROM DAY ONE
        // (the D-M sequencing constraint): Phase 4 defined the hook calling
        // BOTH tasks (the tempo body a guarded no-op); Phase 6 filled the
        // tempo body in place and never refactored this hook.
        _schedulePostLoadTasks(buffer, generation) {
            this._runPeakExtraction(buffer, generation);
            this._runTempoSuggestion(buffer, generation);
        },

        async _runPeakExtraction(buffer, generation) {
            // The pinned yield (W-6): not requestIdleCallback (rejected,
            // CR §6), not a second RAF (D9). After it, the READY paint is
            // done — the waveform work is strictly post-Ready.
            await new Promise((r) => setTimeout(r, 0));
            if (!this._analysisValid(buffer, generation)) return;
            const peaks = extractPeaks(buffer); // pure, never throws (WF-P1.6)
            if (!this._analysisValid(buffer, generation)) return; // re-check before paint (N-14 shape)
            // The caller keeps buffer identity for the guard; the view gets
            // the same handle (it pools via poolPeaks and never walks
            // raw samples).
            this._peaks = { ...peaks };
            this.waveformReady = true;
            if (this._waveformView) this._waveformView.setPeaks(this._peaks);
        },

        // Tempo suggestion task (D-I, Phase 6): same yield + guard shape as
        // the peaks task. Detection is pure math on the decoded samples
        // (<50 ms budget, PERF-1) — the re-check before the write is the
        // N-14/W-14 shape: a superseded file's result never touches state.
        async _runTempoSuggestion(buffer, generation) {
            await new Promise((r) => setTimeout(r, 0));
            if (!this._analysisValid(buffer, generation)) return;
            const { channels, sampleRate } = channelArrays(buffer);
            const result = detectTempo(channels, sampleRate);
            if (!this._analysisValid(buffer, generation)) return; // post-compute re-check (W-14)
            this.applyTempoSuggestion(result);
        },

        // The prefill gate (W-16) — ALL clauses must hold, read AT WRITE
        // TIME (R-10): never captured at kickoff, so a user touch or focus
        // between the kickoff and the ~50 ms detection still wins.
        applyTempoSuggestion(result) {
            if (!result || !result.bpm) return; // null → no prefill, no hint (silence, W-13)
            if (this._bpmTouchedThisFile) return; // the user touched BPM on this file
            if (document.activeElement === document.getElementById('bpmInput')) return; // clause 3: not focused
            if (this.bpmText !== String(this.bpm)) return; // clause 4: not mid-draft (W-16)
            this.bpm = clampBpm(result.bpm);
            this.bpmText = String(this.bpm);
            this.tempoSuggestion = this.bpm; // drives the "Detected ~N BPM" hint (W-3)
            this.announcement = `Detected tempo ${this.bpm} BPM`; // V-07 inventory +1
            this.bpmClamped = false; // the write is in-range by clampBpm — a stale clamp hint from a prior commit cannot describe it (D-H: the two hints are mutually exclusive)
            // The write does NOT set _bpmTouchedThisFile — a suggestion is
            // not a touch: the user may still correct it, and a re-drop
            // re-suggests (CR §2.5 row 1; TD-U1.7).
        },

        // W-14 (superseded file) + W-15 (unmount): one guard, three
        // clauses. `_disposed` is the unmount half, set FIRST by
        // beforeUnmount so in-flight tasks die on teardown.
        _analysisValid(buffer, generation) {
            return !this._disposed && generation === this._loadGeneration && buffer === this._buffer;
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
            this._bpmTouchedThisFile = true; // CR §2.5 row 3: any commit is a touch — INCLUDING the _restoreLastValid garbage branch (typed garbage is a user touch). Set HERE, never inside _restoreLastValid (R-12: it is shared with count-in).
            const result = this._parseParamInput(this.bpmText, clampBpm);
            if (result === null) { this._restoreLastValid('bpm'); return; }
            this.bpm = result.value;
            this._lastValidBpm = result.value;
            this.bpmText = String(result.value);
            this.bpmClamped = result.clamped;
        },

        onBpmStep(delta) {
            this._bpmTouchedThisFile = true; // CR §2.5: either stepper is a touch
            const raw = this.bpm + delta;
            const next = clampBpm(raw);
            this.bpm = next;
            this.bpmText = String(next); // sync the draft (R-C1.4)
            this.bpmClamped = next !== raw;
            this._lastValidBpm = next;
        },

        // CR §2.5 row 4 (R-6): any keystroke in the BPM field is a user
        // touch. No-op EXCEPT the flag — v-model (the directive) owns the
        // draft write to bpmText; this @input handler only sets the flag,
        // and the two are order-independent (TD-U1.10 pins both orders).
        // A programmatic write (the prefill) never fires a DOM input
        // event, so the prefill cannot self-poison the flag.
        onBpmTextInput() {
            this._bpmTouchedThisFile = true;
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

        // CR 003 (EN-D16): the offset's effective maximum — one expression
        // for every commit site. Section active → end − one display tick;
        // else the song duration.
        _offsetMax() {
            return this.end !== null ? this.end - MIN_SECTION_SEC : this.duration;
        },

        // U-10/R-5: THE shared offset scrub law. The waveform canvas
        // (pointer scrub + keyboard, CR 001 Phase 5) and the text field
        // both funnel through here — clampOffset quantizes to the display
        // precision and re-clamps to [0, bound] (T-35), where the bound is
        // the section max while a section is active (EN-D16). No other code
        // re-derives quantization.
        onOffsetScrub(rawValue) {
            const parsed = Number(rawValue);
            if (!Number.isFinite(parsed)) return;
            const value = clampOffset(parsed, this.duration, this._offsetMax());
            this.offset = value;
            this.offsetText = formatTime(value);
            this.offsetClamped = false;
            this.offsetHint = '';
        },

        // --- Waveform scrub + keyboard (CR 001 Phase 5, D-G) ---
        // The canvas replaces the old offset range scrubber (O-1). The
        // pointer path's hygiene (capture try/catch, pointercancel first-
        // class, global pointerup + window blur safety nets, touch-action
        // pan-y) lives in createWaveformView; these handlers own the VM
        // state. Every commit funnels through onOffsetScrub — one
        // quantization law (T-35), never a second.

        // pointerdown: the draft quantizes via the same clampOffset law;
        // the committed offset does not move until scrubEnd(true).
        onWaveformScrubStart(tenths) {
            if (this.isParamLocked) return; // U-12 JS backstop (CSS: pointer-events none)
            if (!Number.isFinite(this.duration) || this.duration <= 0) return; // WF-I2.10 backstop
            this.offsetDraft = clampOffset(tenths, this.duration, this._offsetMax());
            this._waveformView.setDraft(this.offsetDraft);
        },

        // pointermove: draft-only updates under the same law; a move
        // before down (or after a cancel) has no draft to update.
        onWaveformScrubMove(tenths) {
            if (this.offsetDraft === null) return;
            this.offsetDraft = clampOffset(tenths, this.duration, this._offsetMax());
            this._waveformView.setDraft(this.offsetDraft);
        },

        // Every drag-exit funnels here. commit=true → commit through the
        // shared law; commit=false (pointercancel / off-canvas release /
        // window blur) → discard the draft, nothing committed (W-1).
        onWaveformScrubEnd(commit) {
            this._waveformView.setDraft(null);
            if (commit && this.offsetDraft !== null) {
                this.onOffsetScrub(this.offsetDraft);
            }
            this.offsetDraft = null;
        },

        // Full keyboard parity with the range the canvas replaces (W-9):
        // ←/→ ±0.1 s (the old scrubber step), Shift+←/→ ±1 s, PageUp/Down
        // ±10 % of duration (deliberately coarser than the native
        // step×10 — plan-review UX-1), Home/End 0/duration. preventDefault
        // only AFTER a handled commit (skill interaction.md ordering); an
        // unhandled key leaves the browser default alone (WF-I2.9).
        onWaveformKeydown(e) {
            const key = e && e.key;
            if (!key) return;
            if (!Number.isFinite(this.duration) || this.duration <= 0) return; // WF-I2.10 backstop
            const step = e.shiftKey ? 1 : 0.1;
            let next = null;
            switch (key) {
                case 'ArrowLeft': next = this.offset - step; break;
                case 'ArrowRight': next = this.offset + step; break;
                case 'PageDown': next = this.offset - this.duration * 0.1; break;
                case 'PageUp': next = this.offset + this.duration * 0.1; break;
                case 'Home': next = 0; break;
                case 'End': next = this._offsetMax(); break; // CR 003: the section max, not the song end (EN-U1.13)
                default: return;
            }
            this.onOffsetScrub(next);
            e.preventDefault();
        },

        // Template-facing wrapper (Enter/blur) — the testable contract is
        // commitOffsetEntry (V-04).
        onOffsetCommit() {
            this.commitOffsetEntry(this.offsetText);
        },

        // V-04: parse mm:ss.t (or bare seconds), clamp to [0, bound] (the
        // section max while a section is active — EN-D16), sync the text
        // field to the committed value, and surface a hint (EN-D18: the two
        // clamp hints are mutually exclusive; the unbounded string is
        // verbatim).
        commitOffsetEntry(rawValue) {
            const parsed = parseOffsetInput(rawValue);
            if (parsed === null) {
                // Invalid entry: keep the offset, revert the field, hint.
                this.offsetText = formatTime(this.offset);
                this.offsetClamped = true;
                this.offsetHint = 'Enter the time as m:ss.t'; // N-19: matches formatTime's canonical shape
                return;
            }
            const value = clampOffset(parsed, this.duration, this._offsetMax());
            this.offset = value;
            this.offsetText = formatTime(value);
            if (value !== parsed) {
                this.offsetClamped = true;
                this.offsetHint = this._offsetMax() < this.duration
                    ? 'Offset limited by the end point'
                    : 'Offset limited to song length';
            } else {
                this.offsetClamped = false;
                this.offsetHint = '';
            }
        },

        // CR 003 (EN-D6 ordering: empty FIRST): an EMPTY end commits to
        // null ("no end" is a legitimate state — unlike the offset, which
        // restores its last valid value on empty, V-03). Invalid → revert +
        // format hint (string reused, not duplicated). The numeric clamp is
        // clampEnd (U-10) — the two-layers split keeps "empty → null" out of
        // the numeric clamp.
        commitEndEntry(rawValue) {
            const text = (rawValue === null || rawValue === undefined) ? '' : String(rawValue).trim();
            if (text === '') {
                this.end = null;
                this.endText = '';
                this.endClamped = false;
                this.endHint = '';
                return;
            }
            const parsed = parseOffsetInput(text); // reused verbatim — no duplication
            if (parsed === null) {
                this.endText = this.end !== null ? formatTime(this.end) : '';
                this.endClamped = true;
                this.endHint = 'Enter the time as m:ss.t'; // reused string
                return;
            }
            const value = clampEnd(parsed, this.offset, this.duration);
            if (this._endAtSongEnd(value)) {
                // 2026-08-30: a section ending in the song's final display
                // tick IS "no section" — null + empty field. The upper
                // hint fires only when the INPUT overshot the end;
                // otherwise the "song end" placeholder explains it.
                this.end = null;
                this.endText = '';
                this.endClamped = parsed > this.duration;
                this.endHint = this.endClamped ? 'End limited to song length' : '';
                return;
            }
            this.end = value;
            this.endText = formatTime(value);
            if (value !== parsed) {
                this.endClamped = true;
                this.endHint = parsed > value ? 'End limited to song length' : 'End must be after the offset';
            } else {
                this.endClamped = false;
                this.endHint = '';
            }
        },

        // Template-facing wrapper (Enter/blur) — mirrors onOffsetCommit.
        onEndCommit() {
            this.commitEndEntry(this.endText);
        },

        // CR 003 (U-10): THE shared end-scrub law — the end-handle drag and
        // any future end commit funnel through here: clampEnd, sync the
        // field, clear the hints. One quantization law, never a second.
        onEndScrub(tenths) {
            const parsed = Number(tenths);
            if (!Number.isFinite(parsed)) return;
            const value = clampEnd(parsed, this.offset, this.duration);
            if (this._endAtSongEnd(value)) {
                // 2026-08-30: released at the song end → no section —
                // the ghost handle rests there and the field shows the
                // "song end" placeholder again.
                this.end = null;
                this.endText = '';
                this.endClamped = false;
                this.endHint = '';
                return;
            }
            this.end = value;
            this.endText = formatTime(value);
            this.endClamped = false;
            this.endHint = '';
        },

        // 2026-08-30 (at-the-end ⇔ null): a clamped end inside the song's
        // FINAL display tick (one MIN_SECTION_SEC) is "play to the end",
        // i.e. null — not a sub-tick section. One tick is the app's
        // display/quantization resolution (U-10) and the marker's snap
        // resolution, so the drag's "release at the edge to clear" target
        // is a full tick wide instead of one quantization step (the floor
        // law means a drag landing 1 px short of the edge already yields
        // duration − 0.1 — that release must clear, not pin a 0.1 s
        // "section").
        _endAtSongEnd(value) {
            return value >= this.duration - MIN_SECTION_SEC - 1e-9;
        },

        // End-handle drag (mirror of onWaveformScrub* — EN-D8). The draft
        // renders via the DOM overlay (endMarkerPercent is draft-aware);
        // these handlers deliberately NEVER call _waveformView.setDraft
        // (that stays offset-only — no canvas repaint on end drags).
        onEndScrubStart(tenths) {
            if (this.isParamLocked) return; // U-12 JS backstop (CSS: pointer-events none)
            if (!Number.isFinite(this.duration) || this.duration <= 0) return; // WF-I2.10 backstop shape
            this.endDraft = clampEnd(tenths, this.offset, this.duration);
        },

        onEndScrubMove(tenths) {
            if (this.endDraft === null) return;
            this.endDraft = clampEnd(tenths, this.offset, this.duration);
        },

        // commit=true → commit through the shared law; commit=false
        // (pointercancel / window blur) → discard the draft (W-1).
        onEndScrubEnd(commit) {
            if (commit && this.endDraft !== null) this.onEndScrub(this.endDraft);
            this.endDraft = null;
        },

        // --- Saved loops (CR 004) ---
        // W-1 dirty-draft guard (SL-D9): a single match auto-applies ONLY
        // when no field is mid-draft — the three text-vs-model clauses plus
        // offsetDraft and the two CR-003 end clauses (every draft the apply
        // writes is covered).
        _draftsClean() {
            return this.bpmText === String(this.bpm)
                && this.countInText === String(this.countInBeats)
                && this.offsetText === formatTime(this.offset)
                && this.offsetDraft === null
                && this.endText === (this.end === null ? '' : formatTime(this.end))
                && this.endDraft === null;
        },

        // The apply law (W-4, SL-D7): the SINGLE writer for BOTH the ambient
        // auto-apply (ok-branch hook) and the explicit Load. Writes models
        // and drafts together, in the order bpm → countIn → offset → end,
        // computing every flag exactly as its commit path. Writes no
        // announcement — the caller composes (SL-D8/SL-D10).
        applySavedSetup(entry) {
            // 1. BPM (commitBpmEntry law)
            const bpm = clampBpm(entry.bpm);
            this.bpm = bpm;
            this.bpmText = String(bpm);
            this.bpmClamped = bpm !== entry.bpm;
            this._lastValidBpm = bpm;
            // 2. Count-in (commitCountInEntry law)
            const countIn = clampCountIn(entry.countInBeats);
            this.countInBeats = countIn;
            this.countInText = String(countIn);
            this.countInClamped = countIn !== entry.countInBeats;
            this._lastValidCountIn = countIn;
            // 3. Offset — re-validated against the FRESHLY DECODED duration,
            //    never trusted raw. Bounded by DURATION ONLY: the old file's
            //    `end` is about to be replaced, so _offsetMax() (which reads
            //    this.end) would apply a stale section bound to the restore
            //    (commitOffsetEntry law).
            const offset = clampOffset(entry.offset, this.duration);
            this.offset = offset;
            this.offsetText = formatTime(offset);
            if (offset !== entry.offset) {
                this.offsetClamped = true;
                this.offsetHint = 'Offset limited to song length';
            } else {
                this.offsetClamped = false;
                this.offsetHint = '';
            }
            // 4. End (commitEndEntry law, incl. at-the-end ⇔ null)
            if (entry.end === null) {
                this.end = null; this.endText = '';
                this.endClamped = false; this.endHint = '';
            } else {
                const end = clampEnd(entry.end, this.offset, this.duration);
                if (this._endAtSongEnd(end)) {
                    this.end = null; this.endText = '';
                    this.endClamped = entry.end > this.duration;
                    this.endHint = this.endClamped ? 'End limited to song length' : '';
                } else {
                    this.end = end; this.endText = formatTime(end);
                    if (end !== entry.end) {
                        this.endClamped = true;
                        this.endHint = entry.end > end
                            ? 'End limited to song length' : 'End must be after the offset';
                    } else {
                        this.endClamped = false; this.endHint = '';
                    }
                }
            }
            // 5. A restore is a user touch (CR-001 §2.5 flag table +1 row):
            //    structurally suppresses the tempo prefill (W-16 write-time gate).
            this._bpmTouchedThisFile = true;
        },

        // SL-D24: row summary + date (template-scope rule — the template
        // cannot call module functions; instance methods only). The date is
        // environment-dependent and never asserted in tests (R-9).
        setupSummary(entry) {
            return `${entry.bpm} BPM · ${formatTime(entry.offset)} · ${entry.countInBeats} c-in · ${entry.end === null ? 'to end' : 'to ' + formatTime(entry.end)}`;
        },

        savedDate(ms) {
            return new Date(ms).toLocaleDateString();
        },

        // Save (SL-D18): backstops, then WRITE-FIRST — the in-memory VM
        // moves only after the storage write acks (a failed write leaves
        // state byte-for-byte unchanged; the banner is the only effect,
        // RB-4). Captures committed model values only — never drafts (RB-5).
        // Success feedback: the transient "Setup saved" hint on the 3 s
        // _setupSavedHintTimer (SL-D12) — no live-region announcement.
        onSaveSetup() {
            if (!this.savedLoopsAvailable) return;
            if (!this.isReady || this.isParamLocked) return;
            if (!this._liveFileIdentity) return;
            const id = this._liveFileIdentity;
            const entry = { id: newId(), fileName: id.fileName, fileSize: id.fileSize,
                fileLastModified: id.fileLastModified, duration: this.duration,
                bpm: this.bpm, offset: this.offset, countInBeats: this.countInBeats,
                end: this.end, savedAt: Date.now() };
            const next = addEntry(this.savedLoops, entry);
            const res = this._loopStorage.write(encode(next));
            if (res.ok) {
                this.savedLoops = next;
                this.setupSavedHint = 'Setup saved';
                clearTimeout(this._setupSavedHintTimer);
                this._setupSavedHintTimer = setTimeout(() => { this.setupSavedHint = ''; }, 3000);
            } else {
                this.errorMessage = "Couldn't save — storage is full"; // both failure codes (RB-4)
            }
        },

        // Load (SL-D13/SL-D22): the template's :disabled is the primary gate;
        // these backstops are the JS half. Announces NOTHING (SL-D10 — the
        // user just clicked; the visible restoreHint suffices).
        onLoadSetup(entry) {
            if (!this.isReady || this.isParamLocked) return;
            if (!this.matchedEntryIds.includes(entry.id)) return;
            this.applySavedSetup(entry);
            this.restoreHint = 'Restored saved settings';
        },

        // Delete (SL-D11): always enabled, no confirm (XR-5/6 — the CR scopes
        // the U-12 param lock to Save/Load; Delete is metadata-only). The
        // write-first mirror of Save: on ok the VM moves + refocus; on
        // failure the section degrades SILENTLY (savedLoopsAvailable false —
        // it hides; no banner on delete, RB-4) + refocus.
        onDeleteSetup(entry) {
            if (!this._loopStorage) return;
            const next = removeEntry(this.savedLoops, entry.id);
            const res = this._loopStorage.write(encode(next));
            if (res.ok) {
                this.savedLoops = next;
            } else {
                this.savedLoopsAvailable = false; // silent degrade (RB-4)
            }
            this._refocusSaveButton();
        },

        // SL-D11: mirror of _refocusPlayStopButton — after Delete the row's
        // button leaves the DOM and focus would drop into <body>; refocus
        // #saveSetupBtn instead. The $refs entry exists once the Phase-3
        // template binds it; guard its absence so unit rows without the ref
        // don't throw.
        _refocusSaveButton() {
            this.$nextTick(() => {
                const btn = this.$refs && this.$refs.saveSetupBtn;
                if (btn && !btn.disabled) btn.focus();
            });
        },

        // --- Playback (Phase 5) ---
        // V-01: one button, one concern — run audio → stop it, idle → start
        // the count-in/song sequence with the current controls (spec §14.5).
        // Async: the idle path may wait on a context resume (U-19/D10);
        // the stop path and the running-context path complete synchronously.
        async onPlayToggle() {
            if (this.isParamLocked) {
                this._engine.stop();
                // N-8: the drop lock is gone now — clear the message whose
                // condition it was (a stale lock message outlived the stop;
                // an UNRELATED error, e.g. decode, is still relevant). R-N8.1.
                if (this.errorMessage === 'Drop a new song after stopping') this.errorMessage = '';
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

            // N-14: unmount (beforeUnmount → engine dispose) can land
            // BETWEEN the await and here — the post-await guard owns this
            // path (R-N14.1): no engine call, no write to an unmounted VM.
            if (!this._engine) return;

            const result = this._engine.startSequence(this._sequenceParams());
            if (!result || !result.ok) {
                // P-13 defense-in-depth — the UI already clamps, so this is a
                // last-resort guard, not a reachable error path.
                this.errorMessage = "Couldn't start playback";
            } else {
                this.errorMessage = ''; // N-8: the tap unblocked audio — the "blocked" message is stale (R-N8.2)
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
            this.announcement = 'Count-in restarted'; // N-12: V-07 inventory gains the restart event (R-N12.1)
            this.errorMessage = ''; // N-8: a successful restart supersedes a stale error (R-N8.3)
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
        // CR 003 (EN-D15): the `length` key is conditional — ABSENT when
        // unbounded (not null/undefined) so the unbounded call shape stays
        // byte-for-byte (V-01/U-08/P-01…P-14 never need edits). Restart
        // replays the identical section (KB-5 extended to the bound).
        _sequenceParams() {
            const params = {
                buffer: this._buffer,
                bpm: this.bpm,
                countInBeats: this.countInBeats,
                offset: this.offset
            };
            if (this.end !== null) params.length = this.end - this.offset;
            return params;
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
            // CR 003 (EN-D15): `length` only when a section is active — the
            // preview hears exactly what Play will play (EN-D5).
            const params = { buffer: this._buffer, offset: this.offset };
            if (this.end !== null) params.length = this.end - this.offset;
            const result = this._engine.preview(params);
            if (!result || !result.ok) {
                this.errorMessage = "Can't preview from that position";
            } else {
                this.errorMessage = ''; // N-8: a successful preview supersedes a stale error (R-N8.3)
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
                // N-7: constants, not magic strings (R-N7.1).
                case ENGINE_EVENTS.ENDED:
                    this._stopBeatDots();
                    // CR 003 (EN-D7, CR §6 W-1): the engine emits the same
                    // ENDED event either way — the string is composed from
                    // VM state. Stable for the run: params are locked during
                    // playback (U-12).
                    this._returnToReady(this.end !== null ? 'Section ended' : 'Song ended');
                    break;
                case ENGINE_EVENTS.PREVIEW_ENDED:
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
