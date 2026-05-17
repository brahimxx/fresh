/**
 * Component tests for `<ImageInput />` (Task 17.6).
 *
 * Covers Requirement 7 (image upload behaviour as wired into the product form):
 *   - 7.1 / 7.7: Selecting a file POSTs to `/api/upload` and the returned
 *     URL is propagated via `onChange`. Clearing calls `onChange(null)`.
 *   - 7.8: A 4xx upload error renders a non-blocking error indicator and
 *     leaves the previous value intact (i.e. `onChange` is NOT called with
 *     `null` and is NOT called with a new URL).
 *   - 7.9: `onUploadingChange` is invoked with `true` while an upload is in
 *     flight and `false` once it settles (success or failure).
 *   - 7.6: A render error on a broken image URL hides the `<img>` element
 *     entirely (no placeholder fallback while the URL is non-null).
 *
 * The component is at `src/components/ui/image-input.jsx`. We mock
 * `@/lib/api-client` so `api.postFormData` is observable per test without
 * touching the network.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks — declared before the component import so vi.mock hoisting
// applies. The component reads `api.postFormData` from `@/lib/api-client`.
// ---------------------------------------------------------------------------
const postFormDataMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: {
    postFormData: (...args) => postFormDataMock(...args),
  },
}));

// Imported after the mock is wired so the component picks up the stub.
import { ImageInput } from '@/components/ui/image-input';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeFile(name = 'photo.png', type = 'image/png') {
  // jsdom's File constructor is sufficient for fireEvent.change.
  return new File(['x'], name, { type });
}

function getFileInput(container) {
  // The hidden <input type="file"> is the only file input rendered.
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not found');
  return input;
}

function getThumbImage(container) {
  // The thumbnail <img> only renders when `value` is set and not broken.
  return container.querySelector('img');
}

// `api.postFormData` returns a Promise resolving to the parsed JSON body. We
// use a deferred so each test can drive the resolve / reject timing.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('<ImageInput />', () => {
  beforeEach(() => {
    postFormDataMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('POSTs the selected file to /upload and propagates the returned URL via onChange (Req 7.1, 7.7)', async () => {
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    const d = deferred();
    postFormDataMock.mockReturnValue(d.promise);

    const { container } = render(
      <ImageInput
        value={null}
        onChange={onChange}
        onUploadingChange={onUploadingChange}
        type="products"
      />,
    );

    const input = getFileInput(container);
    const file = makeFile('hero.png');

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // The component called the API client with the upload endpoint and a
    // FormData payload carrying the file plus the `type` discriminator.
    expect(postFormDataMock).toHaveBeenCalledTimes(1);
    const [endpoint, fd] = postFormDataMock.mock.calls[0];
    expect(endpoint).toBe('/upload');
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('file')).toBe(file);
    expect(fd.get('type')).toBe('products');

    // Resolve the upload with the documented response shape.
    await act(async () => {
      d.resolve({ data: { url: 'https://cdn.example.com/hero.png' } });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/hero.png');
  });

  it('calls onChange(null) when the Remove button is clicked (Req 7.7)', () => {
    const onChange = vi.fn();

    render(
      <ImageInput
        value="https://cdn.example.com/old.png"
        onChange={onChange}
        type="products"
      />,
    );

    // The Remove button is only rendered when there's a current image.
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows a non-blocking error indicator and preserves the prior value on a 4xx error (Req 7.8)', async () => {
    const onChange = vi.fn();
    const d = deferred();
    postFormDataMock.mockReturnValue(d.promise);

    const { container } = render(
      <ImageInput
        value="https://cdn.example.com/old.png"
        onChange={onChange}
        type="products"
      />,
    );

    const input = getFileInput(container);

    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile()] } });
    });

    // Simulate a 4xx — the api client throws an Error with .status set.
    const apiError = new Error('File too large');
    apiError.status = 413;
    await act(async () => {
      d.reject(apiError);
    });

    // Error indicator is rendered with role="alert" and references the
    // upstream error message (component appends its own trailing copy).
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/File too large/);

    // Prior value is preserved: onChange MUST NOT have been called at all
    // — neither with `null` (which would clear) nor with a new URL.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles onUploadingChange(true) during an upload and (false) after it settles (Req 7.9)', async () => {
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    const d = deferred();
    postFormDataMock.mockReturnValue(d.promise);

    const { container } = render(
      <ImageInput
        value={null}
        onChange={onChange}
        onUploadingChange={onUploadingChange}
        type="products"
      />,
    );

    const input = getFileInput(container);

    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile()] } });
    });

    // While the upload is in flight: the most recent invocation was `true`.
    expect(onUploadingChange).toHaveBeenCalled();
    expect(onUploadingChange.mock.calls[0]).toEqual([true]);

    await act(async () => {
      d.resolve({ data: { url: 'https://cdn.example.com/x.png' } });
    });

    // After it settles: a `false` invocation has been made and is the last.
    const last = onUploadingChange.mock.calls[onUploadingChange.mock.calls.length - 1];
    expect(last).toEqual([false]);

    // And the success path didn't accidentally swallow either edge.
    const seen = onUploadingChange.mock.calls.map((c) => c[0]);
    expect(seen).toContain(true);
    expect(seen).toContain(false);
  });

  it('also reports onUploadingChange(false) when the upload fails (Req 7.9)', async () => {
    const onUploadingChange = vi.fn();
    const d = deferred();
    postFormDataMock.mockReturnValue(d.promise);

    const { container } = render(
      <ImageInput
        value={null}
        onChange={() => {}}
        onUploadingChange={onUploadingChange}
        type="products"
      />,
    );

    await act(async () => {
      fireEvent.change(getFileInput(container), { target: { files: [makeFile()] } });
    });

    await act(async () => {
      d.reject(Object.assign(new Error('Bad request'), { status: 400 }));
    });

    const last = onUploadingChange.mock.calls[onUploadingChange.mock.calls.length - 1];
    expect(last).toEqual([false]);
  });

  it('hides the <img> element when the image fails to render (broken URL) (Req 7.6)', () => {
    const { container } = render(
      <ImageInput
        value="https://cdn.example.com/missing.png"
        onChange={() => {}}
        type="products"
      />,
    );

    // Initially the thumbnail <img> is rendered for the non-null value.
    const img = getThumbImage(container);
    expect(img).not.toBeNull();

    // Fire the native onError — same signal a broken URL produces in the
    // browser. The component flips internal `imageBroken` state, which
    // unmounts the <img> entirely (no placeholder fallback per Req 7.6).
    act(() => {
      fireEvent.error(img);
    });

    expect(getThumbImage(container)).toBeNull();
  });
});
