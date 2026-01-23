"use strict";
/**
 * PPIC Module - Purchase Order Bulk Import with Intelligent Mapping
 * Export all public APIs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ppicRoutes = exports.PPICPerformance = exports.PPICDataProcessor = exports.MappingBuilder = exports.SchemaMapper = exports.DataNormalizer = exports.FuzzyMatcher = exports.ppicController = exports.PPICService = void 0;
var ppic_service_1 = require("./ppic.service");
Object.defineProperty(exports, "PPICService", { enumerable: true, get: function () { return ppic_service_1.PPICService; } });
var ppic_controller_1 = require("./ppic.controller");
Object.defineProperty(exports, "ppicController", { enumerable: true, get: function () { return ppic_controller_1.ppicController; } });
var ppic_parser_1 = require("./ppic.parser");
Object.defineProperty(exports, "FuzzyMatcher", { enumerable: true, get: function () { return ppic_parser_1.FuzzyMatcher; } });
Object.defineProperty(exports, "DataNormalizer", { enumerable: true, get: function () { return ppic_parser_1.DataNormalizer; } });
Object.defineProperty(exports, "SchemaMapper", { enumerable: true, get: function () { return ppic_parser_1.SchemaMapper; } });
Object.defineProperty(exports, "MappingBuilder", { enumerable: true, get: function () { return ppic_parser_1.MappingBuilder; } });
var ppic_utils_1 = require("./ppic.utils");
Object.defineProperty(exports, "PPICDataProcessor", { enumerable: true, get: function () { return ppic_utils_1.PPICDataProcessor; } });
Object.defineProperty(exports, "PPICPerformance", { enumerable: true, get: function () { return ppic_utils_1.PPICPerformance; } });
// Import routes for integration
const ppic_routes_1 = __importDefault(require("./ppic.routes"));
exports.ppicRoutes = ppic_routes_1.default;
