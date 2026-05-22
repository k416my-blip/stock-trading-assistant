import type { MemoryCompressionFeatureId } from '../types/recursiveMemoryCompressionStrategicAbstraction';

export const MEMORY_COMPRESSION_REGULATORY_JA =
  'Recursive Memory Compression & Strategic Abstraction — context explosion / timeline 肥大 / drift を抑制します。Paper Trading のみ・memory optimization 専用・新規売買禁止。';

export const MEMORY_COMPRESSION_AI_PROMPT_JA = `
【Recursive Memory Compression & Strategic Abstraction】
- 長期履歴は抽象 summary に圧縮。replay corruption 時は isolation 優先。
- fatigue 高時は aggressive compression 禁止。新規 buy/sell 禁止。
`.trim();

export const MEMORY_COMPRESSION_UI_LABELS_JA = {
  panelTitle: 'Compression Dashboard',
  saturation: 'Memory Saturation',
  contextLoad: 'Context Load',
  replaySize: 'Replay Size',
  abstraction: 'Abstraction Level',
  ratio: 'Compression Ratio',
  corruption: 'Replay Corruption',
  depth: 'Recursive Depth',
  entropy: 'Timeline Entropy',
  semanticDensity: 'Semantic Density',
  snapshots: 'Snapshots',
  recovery: 'Recovery Health',
  freeze: 'Cognitive Stability Freeze',
} as const;

export const REAL_TRADING_ENABLED = false as const;
export const MEMORY_SATURATION_THRESHOLD = 80;
export const RECURSIVE_DEPTH_THRESHOLD = 6;
export const CONTEXT_OVERFLOW_THRESHOLD = 85;
export const COMPRESSED_TIMELINE_MAX = 24;
export const META_SNAPSHOT_MAX = 12;
export const CONFIDENCE_QUANTIZE_STEP = 5;

export const COMPRESSION_FLOW_JA = [
  'Upstream memory → Recursive compression',
  'Strategic abstraction + narrative deduplication',
  'Timeline entropy reduction + snapshot generation',
  'Safe compression → Recovery validation',
  'Compressed timeline persist',
];

export const ABSTRACTION_FLOW_JA = [
  '古い narrative → abstract summary',
  'layer states → aggregated snapshot',
  'contradiction / unsupported → statistical decay',
];

export const ENTROPY_REDUCTION_FORMULA_JA =
  'entropyAfter = entropyBefore × (1 − compressionRatio/100)';

export const RECURSIVE_DEPTH_FORMULA_JA =
  'depth = activeLayers + freezeSignals + rollbackCount + reflectionCycles';

export const COMPRESSION_RATIO_FORMULA_JA =
  'ratio% = clamp(100 × (1 − compressedBytes / rawBytes))';

export const MEMORY_SATURATION_FORMULA_JA =
  'saturation = 0.3×contextLoad + 0.25×replaySizeNorm + 0.2×entropy + 0.15×recursiveDepth×10 + 0.1×semanticDensity';

export const REPLAY_ISOLATION_FLOW_JA = [
  'replayCorruptionDetected → isolate replay segment',
  'snapshot restore優先、新規 replay 展開禁止',
];

export const SNAPSHOT_RECOVERY_FLOW_JA = [
  'emergency collapse → load latest meta snapshot',
  'governance summary を snapshot から復元',
];

export const EMERGENCY_COLLAPSE_FLOW_JA = [
  'contextOverflowRisk → emergency context collapse',
  'cognitive stability freeze → watch/hold only',
];

export const MEMORY_COMPRESSION_FEATURE_LABELS: Record<MemoryCompressionFeatureId, string> = {
  recursive_memory_compressor: 'Recursive Memory Compressor',
  strategic_abstraction_engine: 'Strategic Abstraction Engine',
  narrative_deduplication: 'Narrative Deduplication',
  timeline_entropy_reducer: 'Timeline Entropy Reducer',
  context_window_optimizer: 'Context Window Optimizer',
  semantic_density_balancer: 'Semantic Density Balancer',
  drift_memory_pruner: 'Drift Memory Pruner',
  replay_compression_engine: 'Replay Compression Engine',
  governance_snapshot_generator: 'Governance Snapshot Generator',
  layer_state_aggregator: 'Layer State Aggregator',
  longitudinal_summary_compressor: 'Longitudinal Summary Compressor',
  reflection_archive_optimizer: 'Reflection Archive Optimizer',
  arbitration_history_reducer: 'Arbitration History Reducer',
  contradiction_archive_compressor: 'Contradiction Archive Compressor',
  unsupported_claim_decay: 'Unsupported Claim Decay',
  confidence_history_quantizer: 'Confidence History Quantizer',
  freeze_timeline_condenser: 'Freeze Timeline Condenser',
  meta_state_snapshot_engine: 'Meta-state Snapshot Engine',
  hierarchical_memory_layering: 'Hierarchical Memory Layering',
  temporal_chunk_partitioning: 'Temporal Chunk Partitioning',
  recursive_context_sanitizer: 'Recursive Context Sanitizer',
  ai_cognitive_load_estimator: 'AI Cognitive Load Estimator',
  memory_saturation_detector: 'Memory Saturation Detector',
  replay_corruption_isolation: 'Replay Corruption Isolation',
  context_recovery_engine: 'Context Recovery Engine',
  safe_compression_mode: 'Safe Compression Mode',
  emergency_context_collapse: 'Emergency Context Collapse',
  snapshot_recovery_engine: 'Snapshot Recovery Engine',
  compression_dashboard: 'Compression Dashboard',
  cognitive_stability_freeze: 'Cognitive Stability Freeze',
};
