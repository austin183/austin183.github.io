/**
 * ImageItem - Image data structure.
 * Ported from Swift ImageItem.swift
 * Web equivalent: uses HTMLImageElement + data URL instead of CGImage/NSImage
 */

let _idCounter = 0;

/**
 * Creates an ImageItem.
 * @param {Object} options
 * @param {HTMLImageElement} options.image - The loaded HTMLImageElement
 * @param {string} options.filename - Original filename
 * @param {number} options.width - Image natural width
 * @param {number} options.height - Image natural height
 * @param {string} [options.thumbnail] - Data URL thumbnail (generated if not provided)
 * @returns {Object} ImageItem
 */
export function createImageItem({ image, filename, width, height, thumbnail }) {
    return {
        id: 'img_' + (++_idCounter) + '_' + Date.now(),
        image: image,
        filename: filename,
        width: width,
        height: height,
        thumbnail: thumbnail || ''
    };
}

/**
  * Generates a thumbnail data URL from an HTMLImageElement.
  * @param {HTMLImageElement} image
  * @param {number} maxDim - Maximum dimension (default 64)
  * @returns {string} Data URL of the thumbnail
  */
export function generateThumbnail(image, maxDim = 64) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let thumbW, thumbH;
    if (image.naturalWidth > image.naturalHeight) {
        thumbW = maxDim;
        thumbH = Math.round(maxDim * image.naturalHeight / image.naturalWidth);
    } else {
        thumbH = maxDim;
        thumbW = Math.round(maxDim * image.naturalWidth / image.naturalHeight);
    }

    canvas.width = thumbW;
    canvas.height = thumbH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, thumbW, thumbH);

    return canvas.toDataURL('image/jpeg', 0.7);
}

/**
  * Disposes an image item by nullifying its image reference.
  * @param {Object} item - ImageItem object
  */
export function disposeImageItem(item) {
    if (item && item.image) {
        item.image = null;
    }
}
