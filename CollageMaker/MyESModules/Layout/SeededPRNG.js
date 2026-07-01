/**
 * SeededPRNG - Deterministic xorshift PRNG for reproducible mosaic layouts.
 * Direct port from Swift Math+Utils.swift
 */

export class SeededPRNG {
    constructor(seed) {
        // Ensure state is always a 32-bit unsigned integer (JS doesn't have UInt64)
        this.state = seed >>> 0;
    }

    next() {
        // Use 32-bit arithmetic to stay within JS safe integer range
        this.state = (this.state + 0x9e3779b9) >>> 0;
        let z = this.state;
        z = ((z ^ (z >>> 30)) * 0xbf58476d) >>> 0;
        z = ((z ^ (z >>> 27)) * 0x94d049bb) >>> 0;
        return (z ^ (z >>> 31)) >>> 0;
    }
}
