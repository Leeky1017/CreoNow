/**
 * Test helpers barrel export.
 *
 * Usage:
 *   import { useFakeTimer, advanceDays, daysAgo } from '../helpers'
 *   import { createMockLlmClient, FIXED_RESPONSES } from '../helpers'
 */
export {
  useFakeTimer,
  advanceMs,
  advanceSeconds,
  advanceDays,
  daysAgo,
} from "./fake-timer";
export { createMockLlmClient, FIXED_RESPONSES } from "./llm-mock";
export type { MockLlmClient } from "./llm-mock";
export {
  assertIPCCall,
  createMockIPCEmitter,
  createMockIPCHandler,
  createMockIPCRenderer,
} from "./ipc";
export type {
  MockIPCEmitter,
  MockIPCHandler,
  MockIPCListener,
  MockIPCCall,
  MockIPCChannelListener,
  MockIPCRenderer,
} from "./ipc";
