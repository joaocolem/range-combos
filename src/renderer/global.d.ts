import type { RangeCombosApi } from '../preload/index'

declare global {
  interface Window {
    api: RangeCombosApi
  }
}

export {}
