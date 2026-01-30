import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../../config/postgres';
import XLSX from 'xlsx';
import fs from 'fs';
import { uploadToDrive } from '../../config/drive';



export class MasterService {
 
async createChangePartMaster(data: any, file?: Express.Multer.File) {
  try {
    let pictureUrl: string | null = null;

    if (file && file.buffer) {   // ✅ FIXED
      pictureUrl = await uploadToDrive(file); 
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

        partPictureUrl: pictureUrl,  // only from upload
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
  fieldMapping?: Record<string, string> // Add field mapping parameter
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

    // ───────────────────────────────────────
    // 2. Process each row
    // ───────────────────────────────────────
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        let pictureUrl: string | null = null;

        // Get image filename using field mapping or default
        const imageColumnName = fieldMapping?.['Change Part Picture'] || 'Change Part Picture';
        const imageFileName = row[imageColumnName]?.toString().trim();

        if (imageFileName && imageMap.has(imageFileName)) {
          pictureUrl = await uploadToDrive(imageMap.get(imageFileName)!);
        }

        // Helper function to get value with field mapping
        const getMappedValue = (fieldName: string): any => {
          const mappedName = fieldMapping?.[fieldName] || fieldName;
          return row[mappedName];
        };

        const record = await prisma.changePartMaster.create({
          data: {
            partPictureUrl: pictureUrl,
            // Use field mapping to get values
            code: getMappedValue('code')?.toString() || null,
            
            // Handle boxSizeAutoCalculated as String as per Prisma model
            boxSizeAutoCalculated: getMappedValue('boxSizeAutoCalculated') !== undefined
              ? String(getMappedValue('boxSizeAutoCalculated'))
              : null,
            
            // Convert to Decimal (use Prisma.Decimal or string)
            cartonRates: getMappedValue('cartonRates') 
              ? new Prisma.Decimal(getMappedValue('cartonRates')) // Use Prisma.Decimal
              : null,
            
            baseFoilConsumption: getMappedValue('baseFoilConsumption')
              ? new Prisma.Decimal(getMappedValue('baseFoilConsumption'))
              : null,
            
            printedFoilConsumption: getMappedValue('printedFoilConsumption')
              ? new Prisma.Decimal(getMappedValue('printedFoilConsumption'))
              : null,
            
            tabSize: getMappedValue('tabSize')?.toString() || null,
            range: getMappedValue('range')?.toString() || null,
            foilSize: getMappedValue('foilSize')?.toString() || null,
          },
        });

        imported.push(record);
      } catch (rowError: any) {
        failed.push(row);
        errors.push({
          row: i + 2, // Excel row number
          message: rowError.message,
          data: row, // Include row data for debugging
        });
      }
    }

    return {
      success: true,
      importedCount: imported.length,
      failedCount: failed.length,
      errors: errors.length > 0 ? errors : undefined,
      driveLink: 'https://drive.google.com/drive/folders/1WUVaaJnsh8BYUIppzFVsZ5QOC1VPkhgd',
    };
  } catch (error: any) {
    throw new Error(`Bulk port failed: ${error.message}`);
  } finally {
    // Cleanup uploaded Excel file if stored on disk
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
}