// Public surface of v2 type generation; helpers in these files stay internal.
export type { JsonSchemaV2, SpecDocumentV2 } from "./spec";
export {
	API_TYPES_FALLBACK_DTS_V2,
	generateApiTypesV2,
	type ApiTypesV2,
} from "./api-types";
export {
	resolveJsonPathSchemaV2,
	type JsonPathSchemaV2,
} from "./jsonpath-schema";
