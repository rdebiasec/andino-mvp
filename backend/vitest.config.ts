import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    reporters: process.env.CI ? ['dot', 'junit'] : ['default'],
    outputFile: process.env.CI ? { junit: 'coverage/junit.xml' } : undefined,
    clearMocks: true
  }
});
