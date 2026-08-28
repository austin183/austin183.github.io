/**
 * fileLoader — drop/browse → decode → Ready, with the memory lifecycle.
 *
 * All dependencies are injected (DIP):
 *   codecs         { check(ext) → bool }        — Howler-backed in production
 *   context        { decodeAudioData(ArrayBuffer) → Promise<AudioBuffer> }
 *   maxDurationSec 30-minute post-decode guard (D3/KB-7); duration is only
 *                   known after decode, so the guard fires here, not pre-load
 *   onStateChange  (state, detail) → void       — 'decoding' { fileName }
 *                   before the first await, 'idle' after (try/finally shape)
 *
 * Contract (F-01…F-09, F-05 rev — N-3):
 *   loadFile(file) resolves — it never throws:
 *     { ok: true,  buffer, duration, fileName }
 *     { ok: false, code: 'noFile' | 'codec' | 'decode' | 'tooLong', message }
 *   Exactly ONE DECODED BUFFER is live at a time (F-05/KB-7): a new
 *   loadFile replaces it, release() drops it. There is no object-URL
 *   lifecycle — decode reads file.arrayBuffer(), and the URL the v1 code
 *   created/tracked/revoked was never consumed by any consumer (deleted
 *   in N-3, grep-verified at review time).
 */

const MAX_DURATION_SEC_DEFAULT = 1800; // 30 minutes (D3)

export function createFileLoader({ codecs, context, maxDurationSec = MAX_DURATION_SEC_DEFAULT, onStateChange }) {
    let currentBuffer = null;

    function releaseCurrent() {
        currentBuffer = null;
    }

    async function loadFile(file) {
        if (file == null) {
            return { ok: false, code: 'noFile', message: 'No file provided' };
        }

        const ext = extractExt(file.name);
        if (!codecs.check(ext)) {
            // U-14 pins the known-extension wording; extensionless files
            // get their own (". files" would be nonsense).
            return {
                ok: false,
                code: 'codec',
                message: ext === ''
                    ? 'This browser can\'t play files with an unrecognized type'
                    : `This browser can't play .${ext} files`
            };
        }

        if (onStateChange) onStateChange('decoding', { fileName: file.name });

        try {
            const bytes = await file.arrayBuffer();
            const buffer = await context.decodeAudioData(bytes);

            if (buffer.duration > maxDurationSec) {
                // N-5: the limit is interpolated — the default (1800 s)
                // still renders the U-20/KB-7 "30 minutes" string.
                return {
                    ok: false,
                    code: 'tooLong',
                    message: `Song too long — maximum length is ${Math.round(maxDurationSec / 60)} minutes`
                };
            }

            currentBuffer = buffer; // replace — exactly one decoded buffer live (F-05)

            return {
                ok: true,
                buffer,
                duration: buffer.duration,
                fileName: file.name
            };
        } catch (err) {
            return {
                ok: false,
                code: 'decode',
                message: `Couldn't decode ${file.name} — the file may be corrupted`
            };
        } finally {
            if (onStateChange) onStateChange('idle');
        }
    }

    function release() {
        releaseCurrent();
    }

    return { loadFile, release };
}

// N-3: private — no production caller outside the loader (its behavior is
// pinned through the codec error message, R-N3.2).
function extractExt(name) {
    const fileName = String(name == null ? '' : name);
    const dot = fileName.lastIndexOf('.');
    if (dot <= 0 || dot === fileName.length - 1) return '';
    return fileName.slice(dot + 1).toLowerCase();
}
