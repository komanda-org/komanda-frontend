import { TestBed } from '@angular/core/testing';
import {
  MAX_ZOOM,
  PhotoCropper,
  centeredFrame,
  clampFrame,
  sourceRect,
  validatePhotoFile,
  zoomFrame,
} from './photo-cropper';

const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'f', { type });

describe('photo cropper math', () => {
  it('accepts only JPG, PNG or WEBP up to 5 MB', () => {
    expect(validatePhotoFile(file('image/png'))).toBeNull();
    expect(validatePhotoFile(file('image/webp'))).toBeNull();
    expect(validatePhotoFile(file('image/gif'))).toContain('JPG, PNG ou WEBP');
    expect(validatePhotoFile(file('image/jpeg', 5 * 1024 * 1024 + 1))).toContain('5 MB');
  });

  it('centers a landscape image covering the square', () => {
    expect(centeredFrame(200, 100)).toEqual({ zoom: 1, x: -0.5, y: 0 });
    expect(sourceRect(centeredFrame(200, 100), 200, 100)).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 });
  });

  it('never leaves an empty border nor zooms out of range', () => {
    expect(clampFrame({ zoom: 1, x: 0.3, y: -2 }, 100, 100)).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(clampFrame({ zoom: 10, x: 0, y: 0 }, 100, 100).zoom).toBe(MAX_ZOOM);
    expect(clampFrame({ zoom: 0.2, x: 0, y: 0 }, 100, 100).zoom).toBe(1);
  });

  it('zooms around the center of the square', () => {
    const frame = zoomFrame({ zoom: 1, x: 0, y: 0 }, 2, 100, 100);
    expect(frame).toEqual({ zoom: 2, x: -0.5, y: -0.5 });
    expect(sourceRect(frame, 100, 100)).toEqual({ sx: 25, sy: 25, sw: 50, sh: 50 });
  });
});

describe('PhotoCropper', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
  });

  afterEach(() => vi.unstubAllGlobals());

  function render(busy = false) {
    const fixture = TestBed.createComponent(PhotoCropper);
    fixture.componentRef.setInput('file', file('image/png'));
    fixture.componentRef.setInput('shape', 'rounded');
    fixture.componentRef.setInput('busy', busy);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders a modal dialog with the chosen preview shape and the actions', () => {
    const { el } = render();

    expect(el.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(el.querySelector('[data-testid="cropper-preview"]')?.classList).toContain('preview__frame--rounded');
    expect(el.querySelector('[data-testid="cropper-cancel"]')?.textContent).toContain('Cancelar');
    expect(el.querySelector('[data-testid="cropper-save"]')?.textContent).toContain('Salvar foto');
  });

  it('emits cancelled, except while uploading', () => {
    const idle = render();
    const cancelled = vi.fn();
    idle.fixture.componentInstance.cancelled.subscribe(cancelled);
    idle.el.querySelector<HTMLButtonElement>('[data-testid="cropper-cancel"]')!.click();
    expect(cancelled).toHaveBeenCalledTimes(1);

    const busy = render(true);
    expect(busy.el.querySelector<HTMLButtonElement>('[data-testid="cropper-cancel"]')!.disabled).toBe(true);
    expect(busy.el.querySelector('[data-testid="cropper-save"]')?.textContent).toContain('Enviando');
  });

  it('shows the upload error it receives', () => {
    const { fixture, el } = render();
    fixture.componentRef.setInput('error', 'A imagem deve ter no máximo 5 MB.');
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="cropper-error"]')?.textContent).toContain('5 MB');
  });
});
