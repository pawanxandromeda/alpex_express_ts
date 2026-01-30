import { Router } from 'express';
import { MasterController } from './master.controller';
import { protect } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/middleware/authorization.middleware';
import { upload } from '../../common/middleware/upload';

const router = Router();
router.use(protect);
const masterController = new MasterController();



// ChangePartMaster routes
router.post(
  '/change-part-master',
  upload.single('file'), // MUST match FormData key
  masterController.createChangePartMaster
);
router.get('/change-part-master', masterController.getAllChangePartMasters);
router.get('/change-part-master/:id', masterController.getChangePartMasterById);
router.put('/change-part-master/:id', authorize(["admin", "manager"]), masterController.updateChangePartMaster);
router.delete('/change-part-master/:id', authorize(["admin"]), masterController.deleteChangePartMaster);
router.post('/change-part-master/bulk-port', upload.fields([
    { name: "file", maxCount: 1 },     // Excel
    { name: "images", maxCount: 500 }, // Pictures
  ]), authorize(["admin", "manager"]), masterController.bulkPortChangePartMaster);

// CompositionMaster routes
router.post('/composition-master', masterController.createCompositionMaster);
router.get('/composition-master', masterController.getAllCompositionMasters);
router.get('/composition-master/:id', masterController.getCompositionMasterById);
router.put('/composition-master/:id', masterController.updateCompositionMaster);
router.delete('/composition-master/:id', masterController.deleteCompositionMaster);
router.post(
  "/composition-master/bulk",
  upload.single("file"),
  masterController.bulkCreateCompositionMasters
);


// ApiMaster routes
router.post('/api-master', masterController.createApiMaster);
router.get('/api-master', masterController.getAllApiMasters);
router.get('/api-master/:id', masterController.getApiMasterById);
router.put('/api-master/:id', masterController.updateApiMaster);
router.delete('/api-master/:id', masterController.deleteApiMaster);

export default router;