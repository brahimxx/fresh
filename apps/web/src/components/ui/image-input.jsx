'use client';

/**
 * <ImageInput />
 *
 * Reusable image picker that uploads to `/api/upload` and exposes the
 * resulting URL via `onChange`. Used by the product form (Task 11.4) but
 * intentionally generic so other dashboard surfaces can reuse it.
 *
 * Behaviour (per Requirement 7):
 *   - Selecting a file POSTs `{ file, type }` as multipart/form-data and
 *     stores the returned URL in the controlled `value`.
 *   - Clicking the clear button sets `value` to `null` (cleared state is
 *     applied immediately on save by the parent form — Requirement 7.7).
 *   - On a 4xx response, a non-blocking error indicator is rendered and the
 *     previous value is left intact so the form stays submittable
 *     (Requirement 7.8).
 *   - While an upload is in flight, `onUploadingChange(true)` is invoked so
 *     the parent can disable Save (Requirement 7.9).
 *   - When `value` is null the placeholder slot is rendered (the parent
 *     decides what icon to put in it, defaults to the `Package` icon).
 *   - On image render error (broken URL / 404), the broken `<img>` is
 *     hidden with no placeholder fallback (Requirement 7.6).
 */

import { useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Package, Trash2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';

export function ImageInput({
  value,
  onChange,
  onUploadingChange,
  type,
  disabled,
  placeholder,
  className,
}) {
  var inputId = useId();
  var inputRef = useRef(null);
  var [uploading, setUploading] = useState(false);
  var [error, setError] = useState('');
  var [imageBroken, setImageBroken] = useState(false);

  function setUploadingState(next) {
    setUploading(next);
    if (typeof onUploadingChange === 'function') onUploadingChange(next);
  }

  async function handleFileChange(event) {
    var file = event.target.files && event.target.files[0];
    // Always reset the native input so the same file can be selected again
    // after a clear. We do this after grabbing the File reference above.
    event.target.value = '';
    if (!file) return;

    setError('');
    setUploadingState(true);
    try {
      var fd = new FormData();
      fd.append('file', file);
      fd.append('type', type || 'misc');
      var res = await api.postFormData('/upload', fd);
      var url = (res && res.data && res.data.url) || (res && res.url);
      if (!url) {
        // Treat a missing URL as a 4xx-equivalent surface — keep prior value.
        setError('Upload failed');
        return;
      }
      setImageBroken(false);
      onChange(url);
    } catch (err) {
      // Requirement 7.8: non-blocking error, prior `image_url` is preserved.
      setError(err && err.message ? err.message : 'Upload failed');
    } finally {
      setUploadingState(false);
    }
  }

  function handleClear() {
    setError('');
    setImageBroken(false);
    onChange(null);
  }

  function openPicker() {
    if (disabled || uploading) return;
    if (inputRef.current) inputRef.current.click();
  }

  var hasImage = !!value && !imageBroken;
  var Placeholder = placeholder || (
    <Package className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className={cn(
            'relative h-24 w-24 shrink-0 rounded-2xl border border-border/60 bg-muted/30 overflow-hidden flex items-center justify-center transition-colors',
            !disabled && !uploading && 'hover:bg-muted/50 cursor-pointer',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
          aria-label={hasImage ? 'Replace product image' : 'Upload product image'}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={function () { setImageBroken(true); }}
            />
          ) : (
            Placeholder
          )}

          {uploading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </button>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPicker}
            disabled={disabled || uploading}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            {hasImage ? 'Replace image' : 'Upload image'}
          </Button>

          {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled || uploading}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}

          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
        </div>
      </div>

      {error && (
        <p
          className="flex items-center gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}. Saved image was not changed.</span>
        </p>
      )}
    </div>
  );
}

export default ImageInput;
