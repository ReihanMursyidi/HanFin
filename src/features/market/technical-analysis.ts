export {
  calculateTechnicalIndicators,
  getStrategyADXSettings,
  getStrategyTrendPeriods,
} from "./technical-indicators";
export type {
  TechnicalAnalysisResult,
  TrendCalculationOptions,
} from "./technical-indicators";
export { validateSingleMomentum } from "./momentum-validation";
export { evaluateSidewaysSignal } from "./sideways-signal";
export type {
  MomentumReversalValidation,
  MomentumSignalDirection,
} from "./momentum-validation";
export type { SidewaysSignalResult } from "./sideways-signal";
