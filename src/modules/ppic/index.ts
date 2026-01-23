/**
 * PPIC Module - Purchase Order Bulk Import with Intelligent Mapping
 * Export all public APIs
 */

export { PPICService } from "./ppic.service";
export { ppicController } from "./ppic.controller";
export {
  FuzzyMatcher,
  DataNormalizer,
  SchemaMapper,
  MappingBuilder,
} from "./ppic.parser";
export { PPICDataProcessor, PPICPerformance } from "./ppic.utils";
export type {
  PPICRow,
  PPICBulkImport,
  PPICFieldMapping,
  PPICBatchResponse,
} from "./ppic.validation";

// Import routes for integration
import ppicRoutes from "./ppic.routes";
export { ppicRoutes };
