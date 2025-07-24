import multer from 'multer';
import { supabase } from './supabase';
import { generateImageHash, checkImageReuse, storeImageHash } from './verification';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload proof screenshot
export async function uploadProofScreenshot(req: any, res: any) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { assignmentId } = req.body;
    const providerId = req.user.id;

    if (!assignmentId) {
      return res.status(400).json({ message: 'Assignment ID is required' });
    }

    // Verify the assignment belongs to this provider
    const { data: assignment, error: assignmentError } = await supabase
      .from('action_assignments')
      .select('id, status')
      .eq('id', assignmentId)
      .eq('provider_id', providerId)
      .single();

    if (assignmentError || !assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'in_progress') {
      return res.status(400).json({ message: 'Assignment is not in progress' });
    }

    // Generate image hash for fraud detection
    const imageHash = generateImageHash(req.file.buffer);
    
    // Check for image reuse
    const { isReused, flagCount } = await checkImageReuse(imageHash, providerId);
    
    if (isReused) {
      return res.status(400).json({ 
        message: `Image has been reused ${flagCount + 1} times. This violates our terms of service.` 
      });
    }

    // Upload to Supabase Storage
    const fileName = `proofs/${providerId}/${assignmentId}/${Date.now()}-${req.file.originalname}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('proof-screenshots')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError);
      return res.status(500).json({ message: 'Failed to upload file' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('proof-screenshots')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Store image hash for tracking
    await storeImageHash(imageHash, parseInt(assignmentId), providerId);

    res.json({ 
      url: imageUrl,
      message: 'File uploaded successfully' 
    });

  } catch (error) {
    console.error('Error uploading proof screenshot:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
}

export { upload };