import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../../config/postgres';
import XLSX from 'xlsx';
import fs from 'fs';

import { uploadBufferToS3 } from '../../common/utils/s3';
import path from 'path/win32';



export class MasterService {
 
async createChangePartMaster(
  data: any,
  file?: Express.Multer.File
) {
  try {
    let pictureUrl: string | null = null;

    if (file?.buffer) {
      // 🔑 Create unique S3 key
      const ext = path.extname(file.originalname);
      const key = `change-parts/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}${ext}`;

      pictureUrl = await uploadBufferToS3(
        file.buffer,
        key,
        file.mimetype
      );
    }

    return await prisma.changePartMaster.create({
      data: {
        code: data.code ?? null,
        tabSize: data.tabSize ?? null,
        range: data.range ?? null,
        foilSize: data.foilSize ?? null,
        boxSizeAutoCalculated: data.boxSizeAutoCalculated ?? null,

        cartonRates: data.cartonRates
          ? new Prisma.Decimal(data.cartonRates)
          : null,

        baseFoilConsumption: data.baseFoilConsumption
          ? new Prisma.Decimal(data.baseFoilConsumption)
          : null,

        printedFoilConsumption: data.printedFoilConsumption
          ? new Prisma.Decimal(data.printedFoilConsumption)
          : null,

        partPictureUrl: pictureUrl, // ✅ S3 URL
      },
    });
  } catch (error) {
    throw error;
  }
}




  async getAllChangePartMasters(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const take = limit;
  
    const [data, total] = await Promise.all([
      prisma.changePartMaster.findMany({ skip, take }),
      prisma.changePartMaster.count(),
    ]);
  
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
  async getChangePartMasterById(id: string) {
    return await prisma.changePartMaster.findUnique({ where: { id } });
  }

  async updateChangePartMaster(id: string, data: any) {
    return await prisma.changePartMaster.update({ where: { id }, data });
  }

  async deleteChangePartMaster(id: string) {
    return await prisma.changePartMaster.delete({ where: { id } });
  }

async bulkPortChangePartMaster(
  file: Express.Multer.File,
  images?: Express.Multer.File[],
  fieldMapping?: Record<string, string>
) {
  const imported: any[] = [];
  const failed: any[] = [];
  const errors: any[] = [];

  try {
    // ───────────────────────────────────────
    // 1. Read Excel / CSV
    // ───────────────────────────────────────
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    // Map images by filename
    const imageMap = new Map<string, Express.Multer.File>();
    images?.forEach((img) => {
      imageMap.set(img.originalname, img);
    });

    // Helper for field mapping
    const getMappedValue = (row: any, fieldName: string) => {
      const mappedName = fieldMapping?.[fieldName] || fieldName;
      return row[mappedName];
    };

    // ───────────────────────────────────────
    // 2. Process rows
    // ───────────────────────────────────────
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        let pictureUrl: string | null = null;

        const imageColumnName =
          fieldMapping?.["Change Part Picture"] || "Change Part Picture";

        const imageFileName = row[imageColumnName]?.toString().trim();

        if (imageFileName && imageMap.has(imageFileName)) {
          const imageFile = imageMap.get(imageFileName)!;

          const ext = path.extname(imageFile.originalname);
          const key = `change-parts/bulk/${Date.now()}-${i}${ext}`;

          pictureUrl = await uploadBufferToS3(
            imageFile.buffer,
            key,
            imageFile.mimetype
          );
        }

        const record = await prisma.changePartMaster.create({
          data: {
            partPictureUrl: pictureUrl,

            code: getMappedValue(row, "code")?.toString() || null,

            boxSizeAutoCalculated:
              getMappedValue(row, "boxSizeAutoCalculated") !== undefined
                ? String(getMappedValue(row, "boxSizeAutoCalculated"))
                : null,

            cartonRates: getMappedValue(row, "cartonRates")
              ? new Prisma.Decimal(getMappedValue(row, "cartonRates"))
              : null,

            baseFoilConsumption: getMappedValue(row, "baseFoilConsumption")
              ? new Prisma.Decimal(getMappedValue(row, "baseFoilConsumption"))
              : null,

            printedFoilConsumption: getMappedValue(row, "printedFoilConsumption")
              ? new Prisma.Decimal(getMappedValue(row, "printedFoilConsumption"))
              : null,

            tabSize: getMappedValue(row, "tabSize")?.toString() || null,
            range: getMappedValue(row, "range")?.toString() || null,
            foilSize: getMappedValue(row, "foilSize")?.toString() || null,
          },
        });

        imported.push(record);
      } catch (rowError: any) {
        failed.push(row);
        errors.push({
          row: i + 2, // Excel row number
          message: rowError.message,
          data: row,
        });
      }
    }

    return {
      success: true,
      importedCount: imported.length,
      failedCount: failed.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    throw new Error(`Bulk import failed: ${error.message}`);
  } finally {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

  async createCompositionMaster(data: any) {
    return await prisma.compositionMaster.create({ data });
  }

 async getAllCompositionMasters(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const [
    total,
    compositions,
    tabletCount,
    capsuleCount,
    liquidCount,
  ] = await Promise.all([
    prisma.compositionMaster.count(),

    prisma.compositionMaster.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),

    // Tablets
    prisma.compositionMaster.count({
      where: { formType: 'Tab' },
    }),

    // Capsules
    prisma.compositionMaster.count({
      where: { formType: 'Cap' },
    }),

    // Liquids (DS + SYR)
    prisma.compositionMaster.count({
      where: {
        OR: [
          { formType: 'DS' },
          { formType: 'SYR' },
        ],
      },
    }),
  ]);

  return {
    data: compositions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: {
      total,
      tablet: tabletCount,
      capsule: capsuleCount,
      liquid: liquidCount,
    },
  };
}


  async getCompositionMasterById(id: string) {
    return await prisma.compositionMaster.findUnique({ where: { id } });
  }

  async updateCompositionMaster(id: string, data: any) {
    return await prisma.compositionMaster.update({ where: { id }, data });
  }

  async deleteCompositionMaster(id: string) {
    return await prisma.compositionMaster.delete({ where: { id } });
  }

async parseCompositionFile(
  file: Express.Multer.File,
  fieldMapping: any
): Promise<any[]> {
  try {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Excel file is empty or invalid");
    }

    const mappedRows = rows.map(row => {
      const mapped: any = {};

      for (const key in fieldMapping) {
        const excelColumnName = fieldMapping[key];
        mapped[key] = row[excelColumnName];
      }

      return mapped;
    });

    return mappedRows;

  } catch (error) {
    throw new Error(`Failed to parse file: ${(error as Error).message}`);
  }
}

 async bulkCreateCompositionMasters(data: any[]) {

  const formattedData = data.map(item => ({

    composition: item.composition ?? null,
    formType: item.formType ?? null,
    packingType: item.packingType ?? null,
    layerType: item.layerType ?? null,
    color: item.color ?? null,
    flavor: item.flavor ?? null,
    coating: item.coating ?? null,

    // ⭐ FIXED ARRAY FIELD
    changePartOptions: item.changePartOptions
      ? String(item.changePartOptions)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [],

    shelfLifeMonths: item.shelfLifeMonths
      ? Number(item.shelfLifeMonths)
      : null,

    review: item.review ?? null
  }));

  return await prisma.compositionMaster.createMany({
    data: formattedData,
    skipDuplicates: true,
  });
}


  async createApiMaster(data: any) {
    return await prisma.apiMaster.create({ data });
  }
  
  async getAllApiMasters() {
    return await prisma.apiMaster.findMany();
  }

  async getApiMasterById(id: string) {
    return await prisma.apiMaster.findUnique({ where: { id } });
  }

  async updateApiMaster(id: string, data: any) {
    return await prisma.apiMaster.update({ where: { id }, data });
  }

  async deleteApiMaster(id: string) {
    return await prisma.apiMaster.delete({ where: { id } });
  }

  async bulkImportApiMaster(
    file: Express.Multer.File,
    fieldMapping?: Record<string, string>
  ) {
    const imported: any[] = [];
    const failed: any[] = [];
    const errors: any[] = [];

    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      const getMappedValue = (fieldName: string, row: any): any => {
        const mappedName = fieldMapping?.[fieldName] || fieldName;
        return row[mappedName];
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const record = await prisma.apiMaster.create({
            data: {
              drugName: getMappedValue('drugName', row) || '',
              drugQuantity: getMappedValue('drugQuantity', row)?.toString() || null,
            },
          });

          imported.push(record);
        } catch (rowError: any) {
          failed.push(row);
          errors.push({
            row: i + 2,
            message: rowError.message,
            data: row,
          });
        }
      }

      return {
        success: true,
        importedCount: imported.length,
        failedCount: failed.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      throw new Error(`Bulk import failed: ${error.message}`);
    } finally {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }

  async createVendorMaster(data: any) {
    return await prisma.vendorMaster.create({ data });
  }

  async getAllVendorMasters(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const take = limit;

    const [data, total] = await Promise.all([
      prisma.vendorMaster.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.vendorMaster.count(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVendorMasterById(id: string) {
    return await prisma.vendorMaster.findUnique({ where: { id } });
  }

  async updateVendorMaster(id: string, data: any) {
    return await prisma.vendorMaster.update({ where: { id }, data });
  }

  async deleteVendorMaster(id: string) {
    return await prisma.vendorMaster.delete({ where: { id } });
  }

  async bulkImportVendorMaster(
    file: Express.Multer.File,
    fieldMapping?: Record<string, string>
  ) {
    const imported: any[] = [];
    const failed: any[] = [];
    const errors: any[] = [];

    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      const getMappedValue = (fieldName: string, row: any): any => {
        const mappedName = fieldMapping?.[fieldName] || fieldName;
        return row[mappedName];
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const record = await prisma.vendorMaster.create({
            data: {
              vendorName: getMappedValue('vendorName', row) || '',
              vendorCode: getMappedValue('vendorCode', row)?.toString() || null,
              contactPerson: getMappedValue('contactPerson', row)?.toString() || null,
              vendorEmail: getMappedValue('vendorEmail', row)?.toString() || null,
              vendorPhone: getMappedValue('vendorPhone', row)?.toString() || null,
              vendorAdress: getMappedValue('vendorAdress', row)?.toString() || null,
              vendorState: getMappedValue('vendorState', row)?.toString() || null,
              vendorGSTNo: getMappedValue('vendorGSTNo', row)?.toString() || null,
              paymentTerms: getMappedValue('paymentTerms', row)?.toString() || null,
              vendorBankName: getMappedValue('vendorBankName', row)?.toString() || null,
              vendorAccountNumber: getMappedValue('vendorAccountNumber', row)?.toString() || null,
              vendorIFSC: getMappedValue('vendorIFSC', row)?.toString() || null,
            },
          });

          imported.push(record);
        } catch (rowError: any) {
          failed.push(row);
          errors.push({
            row: i + 2,
            message: rowError.message,
            data: row,
          });
        }
      }

      return {
        success: true,
        importedCount: imported.length,
        failedCount: failed.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      throw new Error(`Bulk import failed: ${error.message}`);
    } finally {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }
}