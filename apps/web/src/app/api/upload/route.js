import fs from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return errorResponse("No file uploaded", 400);
    }

    // Basic MIME validation
    if (!file.type.startsWith('image/')) {
       return errorResponse("File must inherently be an image.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic file size check (5MB)
    if (buffer.length > 5 * 1024 * 1024) {
       return errorResponse("File exceeds the 5MB upload limit.", 400);
    }

    // Determine sub-directory dynamically based on upload type
    const uploadType = formData.get('type') || 'misc';
    const safeType = uploadType.replace(/[^a-zA-Z0-9_-]/g, ''); // Sanitize to prevent path traversal
    
    const extension = file.name.split('.').pop() || 'png';
    // Utilizing Native Crypto since UUID requires additional imports we might not have
    const uniqueSuffix = crypto.randomUUID();
    const filename = `${uniqueSuffix}.${extension}`;
    
    // Write natively to the Next.JS public/ folder where static assets are immediately securely served
    const relativeDir = path.join('uploads', safeType);
    const targetDir = path.join(process.cwd(), 'public', relativeDir);

    // Ensure the localized directory genuinely exists
    await fs.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, filename);
    await fs.writeFile(targetPath, buffer);

    // Return the literal domain-relative URL route where the asset sits
    return successResponse({ url: `/${relativeDir}/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to securely process the file upload", 500);
  }
}
