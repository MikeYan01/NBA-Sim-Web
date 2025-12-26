/**
 * Seeded Random Number Generator
 *
 * Implements the same Linear Congruential Generator (LCG) algorithm as Java's
 * java.util.Random to ensure deterministic, reproducible results across
 * both implementations.
 *
 * Java's Random uses:
 * - Multiplier: 0x5DEECE66D (25214903917)
 * - Addend: 0xB (11)
 * - Mask: (1 << 48) - 1 (for 48-bit seed)
 *
 * Critical: This must match Java's output exactly for game reproducibility.
 */
export class SeededRandom {
    private seed: bigint

    // Java's LCG constants
    private static readonly MULTIPLIER = 0x5deece66dn
    private static readonly ADDEND = 0xbn
    private static readonly MASK = (1n << 48n) - 1n

    /**
     * Create a new SeededRandom instance.
     * @param seed - The initial seed value
     */
    constructor(seed: number | bigint) {
        // Java scrambles the seed with XOR before first use
        this.seed = (BigInt(seed) ^ SeededRandom.MULTIPLIER) & SeededRandom.MASK
    }

    /**
     * Advance the seed and return the next 'bits' pseudo-random bits.
     * This matches Java's protected next(int bits) method.
     * @param bits - Number of bits to return (1-32)
     * @returns The next pseudo-random value with 'bits' bits
     */
    private next(bits: number): number {
        this.seed = (this.seed * SeededRandom.MULTIPLIER + SeededRandom.ADDEND) & SeededRandom.MASK
        // Return the high bits (shift right by 48 - bits)
        return Number(this.seed >> BigInt(48 - bits))
    }

    /**
     * Returns a pseudo-random integer between 0 (inclusive) and bound (exclusive).
     * Matches Java's nextInt(int bound) method.
     * @param bound - The upper bound (exclusive)
     * @returns A random integer in [0, bound)
     */
    nextInt(bound: number): number {
        if (bound <= 0) {
            throw new Error('bound must be positive')
        }

        // Power of 2 optimization
        if ((bound & -bound) === bound) {
            return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n)
        }

        let bits: number
        let val: number
        do {
            bits = this.next(31)
            val = bits % bound
        } while (bits - val + (bound - 1) < 0)

        return val
    }

    /**
     * Returns a pseudo-random double between 0.0 (inclusive) and 1.0 (exclusive).
     * Matches Java's nextDouble() method.
     * @returns A random double in [0.0, 1.0)
     */
    nextDouble(): number {
        const high = BigInt(this.next(26)) << 27n
        const low = BigInt(this.next(27))
        return Number(high + low) / Number(1n << 53n)
    }

    /**
     * Returns a pseudo-random boolean.
     * Matches Java's nextBoolean() method.
     * @returns A random boolean
     */
    nextBoolean(): boolean {
        return this.next(1) !== 0
    }

    /**
     * Returns a pseudo-random integer (full 32-bit range).
     * Matches Java's nextInt() method (no bound).
     * @returns A random 32-bit integer
     */
    nextIntUnbounded(): number {
        return this.next(32)
    }

    /**
     * Returns a pseudo-random float between 0.0 (inclusive) and 1.0 (exclusive).
     * Matches Java's nextFloat() method.
     * @returns A random float in [0.0, 1.0)
     */
    nextFloat(): number {
        return this.next(24) / (1 << 24)
    }

    /**
     * Get the current seed value (for debugging/testing).
     * @returns The current internal seed
     */
    getSeed(): bigint {
        return this.seed
    }

    /**
     * Set a new seed value.
     * @param seed - The new seed value
     */
    setSeed(seed: number | bigint): void {
        this.seed = (BigInt(seed) ^ SeededRandom.MULTIPLIER) & SeededRandom.MASK
    }
}
