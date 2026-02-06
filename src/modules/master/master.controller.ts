import { Request, Response } from 'express';
import { MasterService } from './master.service';

const masterService = new MasterService();

export class MasterController {

  async createChangePartMaster(req: Request, res: Response) {
  try {
    const result = await masterService.createChangePartMaster(
      req.body,  
      req.file   
    );

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error' });
  }
}




// Controller
async getAllChangePartMasters(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await masterService.getAllChangePartMasters(page, limit);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}

  async getChangePartMasterById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.getChangePartMasterById(id);
      res.status(200).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }

  async updateChangePartMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.updateChangePartMaster(id, req.body);
      res.status(200).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }

  async deleteChangePartMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.deleteChangePartMaster(id);
      res.status(200).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }
 

async bulkPortChangePartMaster(req: Request, res: Response) {
  try {
    const files = req.files as {
      file?: Express.Multer.File[];
      images?: Express.Multer.File[];
    };

    const excelFile = files?.file?.[0];
    const images = files?.images || [];

    if (!excelFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Get field mapping from request body
    const fieldMapping = req.body.fieldMapping 
      ? JSON.parse(req.body.fieldMapping)
      : {};

    const result = await masterService.bulkPortChangePartMaster(
      excelFile,
      images,
      fieldMapping // Pass field mapping
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ 
      success: false,
      error: (error as Error).message 
    });
  }
}

  async createCompositionMaster(req: Request, res: Response) {
    try {
      const result = await masterService.createCompositionMaster(req.body);
      res.status(201).json(result);
    }catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async getAllCompositionMasters(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await masterService.getAllCompositionMasters(page, limit);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}

  async getCompositionMasterById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.getCompositionMasterById(id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async updateCompositionMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.updateCompositionMaster(id, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async deleteCompositionMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.deleteCompositionMaster(id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

async bulkCreateCompositionMasters(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fieldMapping = JSON.parse(req.body.fieldMapping);

    const compositions = await masterService.parseCompositionFile(
      req.file,
      fieldMapping
    );

    const result = await masterService.bulkCreateCompositionMasters(compositions);

    res.status(201).json({
      message: "Bulk import successful",
      count: result.count
    });

  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}


  async createApiMaster(req: Request, res: Response) {
    try {
      const result = await masterService.createApiMaster(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async getAllApiMasters(req: Request, res: Response) {
    try {
      const result = await masterService.getAllApiMasters();
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async getApiMasterById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.getApiMasterById(id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async updateApiMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.updateApiMaster(id, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async deleteApiMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.deleteApiMaster(id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async bulkImportApiMaster(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fieldMapping = req.body.fieldMapping 
        ? JSON.parse(req.body.fieldMapping)
        : {};

      const result = await masterService.bulkImportApiMaster(
        req.file,
        fieldMapping
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(500).json({ 
        success: false,
        error: (error as Error).message 
      });
    }
  }

  async createVendorMaster(req: Request, res: Response) {
    try {
      const result = await masterService.createVendorMaster(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async getAllVendorMasters(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await masterService.getAllVendorMasters(page, limit);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async getVendorMasterById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.getVendorMasterById(id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async updateVendorMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.updateVendorMaster(id, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async deleteVendorMaster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await masterService.deleteVendorMaster(id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  }

  async bulkImportVendorMaster(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fieldMapping = req.body.fieldMapping 
        ? JSON.parse(req.body.fieldMapping)
        : {};

      const result = await masterService.bulkImportVendorMaster(
        req.file,
        fieldMapping
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(500).json({ 
        success: false,
        error: (error as Error).message 
      });
    }
  }
}