'use client';

import { use, useState, useCallback } from 'react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import {
  Images,
  Upload,
  Trash2,
  GripVertical,
  Loader2,
  Sparkles,
  ImagePlus,
  AlertCircle,
  X,
  ZoomIn,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { RequirePermission } from '@/components/layout/require-permission';
import { useGallery, useAddGalleryImage, useReorderGallery, useDeleteGalleryImage } from '@/hooks/use-gallery';
import api from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Upload Dropzone ───────────────────────────────────────────────────────
function UploadDropzone({ salonId, onUploadComplete }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const addImage = useAddGalleryImage();

  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    setUploadError('');
    setIsUploading(true);

    try {
      for (const file of files) {
        // Validate client-side first
        if (!file.type.startsWith('image/')) {
          toast.error(`"${file.name}" is not an image file.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" exceeds the 5MB limit.`);
          continue;
        }

        // Step 1: Upload file to cloud storage via existing /api/upload
        const payload = new FormData();
        payload.append('file', file);
        payload.append('type', 'gallery');

        const uploadRes = await api.postFormData('/upload', payload);
        const imageUrl = uploadRes.data?.url || uploadRes.url;

        if (!imageUrl) {
          toast.error(`Upload failed for "${file.name}".`);
          continue;
        }

        // Step 2: Save the resulting URL to salon_gallery
        await addImage.mutateAsync({
          salonId,
          imageUrl,
        });
      }

      onUploadComplete?.();
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [salonId, addImage, onUploadComplete]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <motion.div variants={itemVariants}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center cursor-pointer group overflow-hidden',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/60 bg-background/40 backdrop-blur-xl hover:border-primary/40 hover:bg-primary/[0.02]',
          isUploading && 'pointer-events-none opacity-70'
        )}
        onClick={() => {
          if (!isUploading) {
            document.getElementById('gallery-file-input').click();
          }
        }}
      >
        {/* Decorative background element */}
        <div className="absolute -right-8 -top-8 text-primary/[0.03] pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <Images className="w-48 h-48" strokeWidth={1} />
        </div>

        <input
          id="gallery-file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files))}
          disabled={isUploading}
        />

        <div className="relative z-10 flex flex-col items-center gap-4">
          {isUploading ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">Uploading…</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Processing your images securely
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <ImagePlus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">
                  {isDragOver ? 'Drop images here' : 'Upload Gallery Images'}
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Drag and drop or click to select • Max 5MB per image
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{uploadError}</p>
            <button onClick={() => setUploadError('')} className="shrink-0">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Gallery Image Card ────────────────────────────────────────────────────
function GalleryImageCard({ image, onDelete, onPreview }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Reorder.Item
      value={image}
      id={String(image.id)}
      className="relative rounded-2xl overflow-hidden bg-muted border border-border/50 shadow-sm group cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      whileDrag={{
        scale: 1.05,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        zIndex: 50,
      }}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="aspect-square relative overflow-hidden">
        <img
          src={image.imageUrl}
          alt={`Gallery image ${image.displayOrder + 1}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          draggable={false}
        />

        {/* Hover overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 flex flex-col items-center justify-between p-3"
            >
              {/* Drag handle hint */}
              <div className="self-start bg-white/20 backdrop-blur-md rounded-lg p-1.5">
                <GripVertical className="h-4 w-4 text-white" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md border-none text-white hover:bg-white/30 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(image);
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-xl bg-red-500/30 backdrop-blur-md border-none text-white hover:bg-red-500/50 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(image);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Order badge */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-xs font-bold border-none shadow-sm">
          #{image.displayOrder + 1}
        </Badge>
      </div>
    </Reorder.Item>
  );
}

// ─── Main Gallery Page ─────────────────────────────────────────────────────
export default function GalleryPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;

  const { data: images = [], isLoading } = useGallery(salonId);
  const reorderMutation = useReorderGallery();
  const deleteMutation = useDeleteGalleryImage();

  const [previewImage, setPreviewImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Handle reorder from framer-motion Reorder.Group
  const handleReorder = useCallback((newOrder) => {
    const items = newOrder.map((img, index) => ({
      id: img.id,
      display_order: index,
    }));

    reorderMutation.mutate({
      salonId,
      items,
    });
  }, [salonId, reorderMutation]);

  // Handle delete confirmation
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate({
      salonId,
      imageId: deleteTarget.id,
    });
    setDeleteTarget(null);
  }, [deleteTarget, salonId, deleteMutation]);

  return (
    <RequirePermission page="gallery">
      <div className="space-y-8">
        {/* ─── Hero Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/10 via-background to-transparent border border-violet-500/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
        >
          <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
            <Images className="w-64 h-64 text-violet-500" strokeWidth={1} />
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-violet-500/20 text-xs font-semibold text-violet-600 dark:text-violet-400 w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visual Identity</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
              Gallery
            </h1>
            <p className="text-muted-foreground text-lg font-medium max-w-xl">
              Curate your salon's visual story. Upload, arrange, and manage the images that represent your brand on the marketplace.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            {!isLoading && (
              <Badge variant="secondary" className="text-sm font-bold px-4 py-2 rounded-xl bg-background/80 backdrop-blur-md border-violet-500/20">
                <Images className="h-4 w-4 mr-2 text-violet-500" />
                {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
              </Badge>
            )}
          </div>
        </motion.div>

        {/* ─── Upload Dropzone ─── */}
        <UploadDropzone salonId={salonId} />

        {/* ─── Gallery Grid ─── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : images.length > 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Drag to reorder • {images.length} image{images.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Reorder.Group
              axis="x"
              values={images}
              onReorder={handleReorder}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              style={{ listStyle: 'none' }}
            >
              {images.map((image) => (
                <GalleryImageCard
                  key={image.id}
                  image={image}
                  onDelete={setDeleteTarget}
                  onPreview={setPreviewImage}
                />
              ))}
            </Reorder.Group>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-background/40 backdrop-blur-xl border-2 border-dashed border-border/50 rounded-3xl p-16 text-center"
          >
            <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Images className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xl font-bold tracking-tight mb-2">No Images Yet</p>
            <p className="text-muted-foreground font-medium max-w-sm mx-auto">
              Start building your salon's visual portfolio. Upload your first image using the dropzone above.
            </p>
          </motion.div>
        )}

        {/* ─── Image Preview Dialog ─── */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden bg-black/95 border-none shadow-2xl">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </DialogClose>
            {previewImage && (
              <div className="flex items-center justify-center p-8 min-h-[60vh]">
                <img
                  src={previewImage.imageUrl}
                  alt="Gallery preview"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Delete Confirmation ─── */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-bold">Delete Image?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently remove this image from your gallery. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Image
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  );
}
