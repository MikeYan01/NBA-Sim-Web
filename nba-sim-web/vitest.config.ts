/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    define: {
        'process.env.NODE_ENV': '"test"',
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'src/models/**/*.ts',
                'src/services/**/*.ts',
                'src/utils/**/*.ts',
            ],
            exclude: [
                'src/main.tsx',
                'src/vite-env.d.ts',
                'src/**/*.d.ts',
                'src/components/**',
                'src/workers/**',
                'src/hooks/**',
                'src/stores/**',
                'src/App.tsx',
            ],
            thresholds: {
                'src/models/**': {
                    statements: 90,
                    branches: 80,
                    functions: 90,
                    lines: 90,
                },
            },
        },
    },
})
