import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 相対パス基準にしておくと、GitHub Pages のサブパス配信でもそのまま動く。
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
