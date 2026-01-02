import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadDocument, getDocument, deleteDocument } from '../controllers/document.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png').split(',');
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

router.use(authenticate);

router.post('/upload', authorize('admin', 'sales_officer'), upload.single('file'), uploadDocument);
router.get('/:id', getDocument);
router.delete('/:id', authorize('admin', 'sales_officer'), deleteDocument);

export default router;
