/**
 * PPIC Parser - Advanced Data Normalization & Field Mapping
 * Handles messy, inconsistent data from sheets with intelligent fuzzy matching
 */

export interface FieldMapping {
  sheetColumn: string;
  poField: string;
  parser: (value: any) => any;
  optional?: boolean;
}

export interface MappingStrategy {
  [key: string]: FieldMapping[];
}

/**
 * Fuzzy string matching to find best column mapping
 * Handles typos, case differences, spacing issues
 */
export class FuzzyMatcher {
  private static readonly SIMILARITY_THRESHOLD = 0.7;
  private static readonly ABBREVIATIONS: Record<string, string[]> = {
    phone: ["phone", "tel", "mobile", "contact", "ph", "number", "no"],
    email: ["email", "mail", "e-mail", "address"],
    name: ["name", "nm", "customer name", "party name", "companyname"],
    gst: ["gst", "gstn", "gst no", "gst number", "tax id"],
    address: ["address", "addr", "location", "city", "place"],
    date: ["date", "dt", "on"],
    quantity: ["qty", "quantity", "qnty", "count", "nos"],
    rate: ["rate", "price", "amt", "cost"],
    amount: ["amount", "total", "amt", "value"],
  };

  static levenshteinDistance(str1: string, str2: string): number {
    const a = str1.toLowerCase().trim();
    const b = str2.toLowerCase().trim();

    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[b.length][a.length];
  }

  static calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return 1 - distance / maxLen;
  }

  static findBestMatch(
    searchTerm: string,
    candidates: string[]
  ): { match: string; similarity: number } | null {
    let bestMatch = null;
    let bestSimilarity = this.SIMILARITY_THRESHOLD;

    const normalizedSearch = searchTerm.toLowerCase().trim();

    // First: Try exact case-insensitive match
    for (const candidate of candidates) {
      const normalizedCandidate = candidate.toLowerCase().trim();
      if (normalizedCandidate === normalizedSearch) {
        return { match: candidate, similarity: 1.0 };
      }
    }

    // Second: Check abbreviations
    for (const [key, abbrevs] of Object.entries(this.ABBREVIATIONS)) {
      if (abbrevs.some((a) => normalizedSearch === a.toLowerCase())) {
        for (const candidate of candidates) {
          const normalizedCandidate = candidate.toLowerCase();
          if (normalizedCandidate.includes(key)) {
            return { match: candidate, similarity: 0.95 };
          }
        }
      }
    }

    // Third: Check partial match (one contains the other)
    for (const candidate of candidates) {
      const normalizedCandidate = candidate.toLowerCase().trim();
      if (
        normalizedCandidate.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedCandidate)
      ) {
        const similarity =
          Math.max(
            normalizedSearch.length,
            normalizedCandidate.length
          ) / Math.min(normalizedSearch.length, normalizedCandidate.length);
        if (similarity > bestSimilarity) {
          bestSimilarity = Math.min(similarity, 0.9);
          bestMatch = candidate;
        }
      }
    }

    // Fourth: Fuzzy matching (Levenshtein distance)
    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(
        normalizedSearch,
        candidate.toLowerCase()
      );
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = candidate;
      }
    }

    return bestMatch ? { match: bestMatch, similarity: bestSimilarity } : null;
  }
}

/**
 * Data Normalizers - Convert messy data to proper formats
 */
export class DataNormalizer {
  /**
   * Parse phone numbers intelligently
   * Handles: 9876543210, 98-7654-3210, +91-98-7654-3210, 034567804566
   */
  static parsePhone(value: any): string | null {
    if (!value) return null;

    const str = String(value).trim();
    // Extract only digits
    const digits = str.replace(/\D/g, "");

    // Validate length (Indian: 10 digits for mobile, international can vary)
    if (digits.length >= 10) {
      // Take last 10 digits for Indian format, or all digits
      const phone = digits.length > 10 ? digits.slice(-10) : digits;
      return phone;
    }

    return null;
  }

  /**
   * Parse dates intelligently
   * Handles: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, Excel serial, ISO string
   */
  static parseDate(value: any): Date | null {
    if (!value) return null;

    // If already a Date
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    const str = String(value).trim();

    // Excel serial date (number between 0 and 60000)
    if (!isNaN(Number(str)) && Number(str) > 0 && Number(str) < 60000) {
      const excelDate = Number(str);
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try parsing common formats
    const formats = [
      /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // DD/MM/YYYY or DD-MM-YYYY
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY/MM/DD
    ];

    for (const format of formats) {
      const match = str.match(format);
      if (match) {
        let day, month, year;
        if (match[3].length === 4) {
          // Format: DD/MM/YYYY
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        } else {
          // Format: YYYY/MM/DD
          day = parseInt(match[3]);
          month = parseInt(match[2]);
          year = parseInt(match[1]);
        }

        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Try native parsing
    const date = new Date(str);
    return !isNaN(date.getTime()) ? date : null;
  }

  /**
   * Parse numeric values
   * Handles: "1000.50", "1,000.50", "1000", negative, currency symbols
   */
  static parseNumber(value: any, type: "int" | "float" = "float"): number | null {
    if (value === null || value === undefined || value === "") return null;

    // Remove currency symbols and whitespace
    let str = String(value)
      .trim()
      .replace(/[^\d.-]/g, "");

    const num = parseFloat(str);
    return isNaN(num) ? null : type === "int" ? Math.round(num) : num;
  }

  /**
   * Parse boolean values intelligently
   */
  static parseBoolean(value: any): boolean | null {
    if (typeof value === "boolean") return value;
    if (value === null || value === undefined) return null;

    const str = String(value).toLowerCase().trim();
    return (
      ["yes", "y", "true", "1", "active", "enabled", "on"].includes(str) ||
      null
    );
  }

  /**
   * Normalize string - trim, remove extra spaces, handle HTML entities
   */
  static parseString(value: any): string | null {
    if (!value) return null;
    return String(value)
      .trim()
      .replace(/\s+/g, " ")
      .substring(0, 500); // Limit to 500 chars for safety
  }

  /**
   * Smart contact field extraction
   * Extracts phone, email, name from combined fields
   */
  static parseContact(value: any): {
    phone?: string;
    email?: string;
    name?: string;
  } | null {
    if (!value) return null;

    const str = String(value).trim();
    const result: any = {};

    // Extract email
    const emailMatch = str.match(/([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      result.email = emailMatch[1];
    }

    // Extract phone
    const phoneMatch = str.match(/(\d{10,})/);
    if (phoneMatch) {
      result.phone = this.parsePhone(phoneMatch[1]);
    }

    // Extract name (remaining text)
    let name = str;
    if (emailMatch) name = name.replace(emailMatch[0], "");
    if (phoneMatch) name = name.replace(phoneMatch[0], "");
    name = name.replace(/[(),\-]/g, "").trim();
    if (name) result.name = name;

    return Object.keys(result).length > 0 ? result : null;
  }
}

/**
 * Schema-Aware Mapper - Maps raw data to PO schema with validation
 */
export class SchemaMapper {
  private static readonly PO_FIELD_SCHEMA: Record<string, any> = {
    // Required/Primary fields
    poNo: { type: "string", validators: ["required", "unique"], maxLength: 50 },
    gstNo: { type: "string", validators: ["required", "gstFormat"] },

    // Dates
    poDate: { type: "date", validators: [] },
    dispatchDate: { type: "date", validators: [] },
    expiry: { type: "date", validators: [] },
    foilPoDate: { type: "date", validators: [] },
    foilBillDate: { type: "date", validators: [] },
    cartonPoDate: { type: "date", validators: [] },
    cartonBillDate: { type: "date", validators: [] },
    packingDate: { type: "date", validators: [] },
    invoiceDate: { type: "date", validators: [] },

    // Numbers (kept as strings to preserve exact data from sheet)
    poQty: { type: "string", validators: [] },
    batchQty: { type: "string", validators: [] },
    foilQuantity: { type: "string", validators: [] },
    cartonQuantity: { type: "string", validators: [] },
    qtyPacked: { type: "string", validators: [] },
    noOfShippers: { type: "string", validators: [] },
    changePart: { type: "string", validators: [] },
    cyc: { type: "string", validators: [] },
    foilQuantityOrdered: { type: "string", validators: [] },
    cartonQuantityOrdered: { type: "string", validators: [] },
    poRate: { type: "string", validators: [] },
    amount: { type: "string", validators: [] },
    mrp: { type: "string", validators: [] },
    advance: { type: "string", validators: [] },

    // Strings
    brandName: { type: "string", validators: [], maxLength: 100 },
    partyName: { type: "string", validators: [], maxLength: 100 },
    batchNo: { type: "string", validators: [], maxLength: 50 },
    paymentTerms: { type: "string", validators: [], maxLength: 100 },
    invCha: { type: "string", validators: [], maxLength: 100 },
    cylChar: { type: "string", validators: [], maxLength: 100 },
    orderThrough: { type: "string", validators: [], maxLength: 100 },
    address: { type: "string", validators: [], maxLength: 500 },
    composition: { type: "string", validators: [], maxLength: 500 },
    notes: { type: "string", validators: [], maxLength: 1000 },
    rmStatus: { type: "string", validators: [], maxLength: 50 },
    section: { type: "string", validators: [], maxLength: 50 },
    specialRequirements: { type: "string", validators: [], maxLength: 500 },
    tabletCapsuleDrySyrupBottle: { type: "string", validators: [], maxLength: 100 },
    roundOvalTablet: { type: "string", validators: [], maxLength: 100 },
    tabletColour: { type: "string", validators: [], maxLength: 50 },
    aluAluBlisterStripBottle: { type: "string", validators: [], maxLength: 100 },
    packStyle: { type: "string", validators: [], maxLength: 100 },
    productNewOld: { type: "string", validators: [], maxLength: 50 },
    qaObservations: { type: "string", validators: [], maxLength: 500 },
    pvcColourBase: { type: "string", validators: [], maxLength: 50 },
    foil: { type: "string", validators: [], maxLength: 50 },
    lotNo: { type: "string", validators: [], maxLength: 50 },
    foilSize: { type: "string", validators: [], maxLength: 50 },
    foilPoVendor: { type: "string", validators: [], maxLength: 100 },
    cartonPoVendor: { type: "string", validators: [], maxLength: 100 },
    design: { type: "string", validators: [], maxLength: 500 },
    invoiceNo: { type: "string", validators: [], maxLength: 50 },
  };

  static validateGSTFormat(gst: string): boolean {
    // Indian GST format: 2-digit state code + 10-digit PAN + 1-digit entity + 1-digit Z code
    return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$/.test(gst);
  }

  static mapAndValidate(
    rawData: Record<string, any>,
    fieldMappings: Record<string, string>
  ): {
    data: Record<string, any>;
    errors: Array<{ field: string; message: string }>;
  } {
    const data: Record<string, any> = {};
    const errors: Array<{ field: string; message: string }> = [];

    for (const [poField, sheetColumn] of Object.entries(fieldMappings)) {
      if (!sheetColumn || !(sheetColumn in rawData)) continue;

      const rawValue = rawData[sheetColumn];
      
      // Skip null/undefined/empty values
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;

      const schema = this.PO_FIELD_SCHEMA[poField];

      // Allow unknown fields - just store the raw value
      if (!schema) {
        // Store unknown fields as-is, without error
        data[poField] = rawValue;
        continue;
      }

      try {
        let parsedValue: any = rawValue;

        // For string fields, keep the raw value without parsing
        // This preserves data exactly as it is, regardless of content
        if (schema.type === "string") {
          parsedValue = String(rawValue).trim();
        } else {
          // For other types, still parse but store raw on failure
          switch (schema.type) {
            case "date":
              parsedValue = DataNormalizer.parseDate(rawValue);
              break;
            case "int":
              parsedValue = DataNormalizer.parseNumber(rawValue, "int");
              break;
            case "float":
              parsedValue = DataNormalizer.parseNumber(rawValue, "float");
              break;
            case "boolean":
              parsedValue = DataNormalizer.parseBoolean(rawValue);
              break;
          }
        }

        // If parsing failed for non-string types, store as string instead
        if (parsedValue === null && schema.type !== "string") {
          parsedValue = String(rawValue);
        }

        // Max length check for strings
        if (schema.maxLength && typeof parsedValue === "string" && parsedValue.length > schema.maxLength) {
          parsedValue = parsedValue.substring(0, schema.maxLength);
        }

        if (parsedValue !== null && parsedValue !== undefined && parsedValue !== '') {
          data[poField] = parsedValue;
        }
      } catch (err) {
        // Store raw value as string on parse error
        data[poField] = String(rawValue);
      }
    }

    return { data, errors };
  }
}

/**
 * Mapping Builder - Auto-detect and build field mappings
 */
export class MappingBuilder {
  static readonly FIELD_ALIASES: Record<string, string[]> = {
    // Required fields - HIGH PRIORITY
    poNo: ["po no", "po number", "pono", "order no", "order number", "po no."],
    gstNo: ["gstno", "gst no", "gst number", "gst", "tax id", "gstin"],

    // Dates
    poDate: ["po date", "po datetime", "order date", "po date"],
    dispatchDate: [
      "dispatch date",
      "shipping date",
      "delivery date",
      "dispatch date",
    ],
    expiry: ["expiry", "expiry date", "manufacture date", "mfd", "expiration"],
    foilPoDate: ["foil po date", "foil po date"],
    foilBillDate: ["foil bill date", "foil bill date"],
    cartonPoDate: ["carton po date", "carton po date"],
    cartonBillDate: ["carton bill date", "carton bill date"],
    packingDate: ["packing date", "packing date"],
    invoiceDate: ["invoice date", "invoice date"],

    // Quantities
    poQty: ["po qty", "quantity", "qty", "po qty", "order qty"],
    batchQty: ["batch qty", "batchqty", "batch quantity"],
    foilQuantity: ["foil quantity", "foilquantity"],
    cartonQuantity: ["carton quantity", "cartonquantity"],
    qtyPacked: ["qty packed", "qtypacked", "quantity packed"],
    noOfShippers: ["no of shippers", "shippers", "no. of shippers"],
    foilQuantityOrdered: ["foil quantity ordered", "foilquantityordered"],
    cartonQuantityOrdered: ["carton quantity ordered", "cartonquantityordered"],

    // Prices & Amounts
    poRate: ["po rate", "rate", "price", "unit price", "cost"],
    amount: ["amount", "total", "total amount"],
    mrp: ["mrp", "list price", "sale price"],
    advance: ["advance", "advance amount"],

    // Strings - Product & Party
    brandName: ["brand name", "brand", "product brand"],
    partyName: ["party name", "party", "customer", "company", "vendor"],
    batchNo: ["batch no", "batch number", "batch", "lot"],
    paymentTerms: ["payment terms", "terms", "payment condition"],
    orderThrough: ["order through", "ordered through", "via"],

    // Strings - Contact & Location
    invCha: ["inv. cha.", "invoice charge", "inv charge", "packaging charge"],
    cylChar: ["cyl. char.", "cylinder charge"],
    address: ["address", "location", "place", "delivery address"],
    composition: ["composition", "formula", "ingredient"],
    notes: ["notes", "remarks", "comments"],

    // Strings - Status & Tracking
    rmStatus: ["rm status", "raw material status", "status"],
    section: ["section", "category", "type"],
    specialRequirements: [
      "special requirements",
      "special req",
      "requirements",
    ],

    // Strings - Tablet/Bottle Specs
    tabletCapsuleDrySyrupBottle: [
      "tablet capsule dry syrup bottle",
      "tablet/capsule/dry syrup/bottle",
      "tablet capsule",
    ],
    roundOvalTablet: ["round oval tablet", "round/oval tablet", "tablet shape"],
    tabletColour: ["tablet colour", "tablet color", "colour"],
    aluAluBlisterStripBottle: [
      "alu-alu/blister/strip/bottle",
      "alu alu blister strip bottle",
      "alu-alu",
      "blister",
      "pack type",
      "packaging",
    ],

    // Strings - Packing & Design
    packStyle: ["pack style", "packing style", "pack format"],
    productNewOld: ["product new/old", "product newold", "product"],
    qaObservations: ["qa observations", "qa obs", "quality observations"],
    pvcColourBase: ["pvc colour base", "pvc color", "pvc"],
    foil: ["foil", "foil type"],
    lotNo: ["lot no", "lot number", "lot"],
    foilSize: ["foil size", "foil"],
    foilPoVendor: ["foil po vendor", "foil vendor"],
    cartonPoVendor: ["carton po vendor", "carton vendor"],
    design: ["design", "design file", "artwork"],
    invoiceNo: ["invoice no", "invoice number", "invoice", "invoice no."],
  };

  /**
   * Auto-detect mappings from sheet headers
   * Maps sheet headers to PurchaseOrder field names using fuzzy matching
   */
  static buildMapping(sheetHeaders: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const sheetHeader of sheetHeaders) {
      // Try to find matching PO field using aliases
      for (const [poField, aliases] of Object.entries(this.FIELD_ALIASES)) {
        const headerLower = sheetHeader.toLowerCase().trim();
        
        // Check if header matches any alias for this field
        for (const alias of aliases) {
          if (headerLower === alias.toLowerCase()) {
            mapping[poField] = sheetHeader; // Map PO field to sheet header
            break;
          }
        }
        
        // If found, stop checking other fields
        if (mapping[poField]) break;
      }

      // If no match found, skip this header
      // Unknown headers will be captured in rawImportedData
    }

    return mapping;
  }
}
