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
 * Contract (F-01…F-09):
 *   loadFile(file) resolves — it never throws:
 *     { ok: true,  buffer, duration, fileName, objectUrl }
 *     { ok: false, code: 'noFile' | 'codec' | 'decode' | 'tooLong', message }
 *   Exactly one object URL is live at a time; every exit path (success,
 *   codec, decode, tooLong, release) leaves no live orphan URL (F-05/KB-7).
 *   The previous buffer reference is dropped when a new file loads.
 */

const MAX_DURATION_SEC_DEFAULT = 1800; // 30 minutes (D3)

export function createFileLoader({ codecs, context, maxDurationSec = MAX_DURATION_SEC_DEFAULT, onStateChange }) {
    let currentBuffer = null;
    let currentUrl = null;

    function releaseCurrent() {
        if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
            currentUrl = null;
        }
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

        const objectUrl = URL.createObjectURL(file);
        try {
            const bytes = await file.arrayBuffer();
            const buffer = await context.decodeAudioData(bytes);

            if (buffer.duration > maxDurationSec) {
                return {
                    ok: false,
                    code: 'tooLong',
                    message: 'Song too long — maximum length is 30 minutes'
                };
            }

            releaseCurrent(); // drop the previous song (F-05)
            currentBuffer = buffer;
            currentUrl = objectUrl;

            return {
                ok: true,
                buffer,
                duration: buffer.duration,
                fileName: file.name,
                objectUrl
            };
        } catch (err) {
            return {
                ok: false,
                code: 'decode',
                message: `Couldn't decode ${file.name} — the file may be corrupted`
            };
        } finally {
            // If this URL did not become the live one (decode/tooLong
            // failure), revoke the attempt — no orphan URL on any path.
            if (currentUrl !== objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            if (onStateChange) onStateChange('idle');
        }
    }

    function release() {
        releaseCurrent();
    }

    function extractExt(name) {
        const fileName = String(name == null ? '' : name);
        const dot = fileName.lastIndexOf('.');
        if (dot <= 0 || dot === fileName.length - 1) return '';
        return fileName.slice(dot + 1).toLowerCase();
    }

    return { loadFile, release, extractExt };
}
