/**
 * codecSupport — runtime codec gate backed by Howler.
 *
 * `Howler.codecs(ext)` is the single source of truth for "can this browser
 * play this extension" (research §6: mp3 works everywhere; .ogg does not in
 * Safari). An empty extension means "unknown file type" and is rejected
 * without consulting Howler (F-07: extensionless files are not supported).
 */

export function isSupportedCodec(ext) {
    if (typeof ext !== 'string' || ext === '') return false;

    const Howler = typeof window !== 'undefined' ? window.Howler : undefined;
    if (!Howler || typeof Howler.codecs !== 'function') return false;

    return !!Howler.codecs(ext);
}
