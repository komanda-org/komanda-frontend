import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_OUTPUT_SIZE = 512;
export const MAX_ZOOM = 4;
const KEY_STEP = 0.02;

/** Frase para o arquivo recusado antes de abrir o editor, ou null se ele serve. */
export function validatePhotoFile(file: File): string | null {
  if (!PHOTO_ACCEPT.split(',').includes(file.type)) {
    return 'Use uma imagem JPG, PNG ou WEBP.';
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return 'A imagem deve ter no máximo 5 MB.';
  }
  return null;
}

/**
 * Enquadramento em unidades do quadro (lado do quadro = 1): `x`/`y` sao o canto
 * superior esquerdo da imagem, sempre <= 0 para a imagem cobrir o quadro todo.
 */
export interface Frame {
  zoom: number;
  x: number;
  y: number;
}

/** Tamanho da imagem no quadro: com zoom 1 o lado menor encaixa exatamente. */
export function frameSize(width: number, height: number, zoom: number): { w: number; h: number } {
  const short = Math.min(width, height);
  return { w: (zoom * width) / short, h: (zoom * height) / short };
}

export function clampFrame(frame: Frame, width: number, height: number): Frame {
  const zoom = Math.min(Math.max(frame.zoom, 1), MAX_ZOOM);
  const { w, h } = frameSize(width, height, zoom);
  const clamp = (value: number, size: number) => Math.min(0, Math.max(1 - size, value));
  return { zoom, x: clamp(frame.x, w), y: clamp(frame.y, h) };
}

/** Novo zoom mantendo fixo o ponto da imagem que esta no centro do quadro. */
export function zoomFrame(frame: Frame, zoom: number, width: number, height: number): Frame {
  const before = frameSize(width, height, frame.zoom);
  const after = frameSize(width, height, zoom);
  const cx = (0.5 - frame.x) / before.w;
  const cy = (0.5 - frame.y) / before.h;
  return clampFrame({ zoom, x: 0.5 - cx * after.w, y: 0.5 - cy * after.h }, width, height);
}

export function centeredFrame(width: number, height: number): Frame {
  const { w, h } = frameSize(width, height, 1);
  return { zoom: 1, x: (1 - w) / 2, y: (1 - h) / 2 };
}

/** Recorte em pixels da imagem original. */
export function sourceRect(frame: Frame, width: number, height: number) {
  const { w, h } = frameSize(width, height, frame.zoom);
  return { sx: ((0 - frame.x) / w) * width, sy: ((0 - frame.y) / h) * height, sw: width / w, sh: height / h };
}

export type CropShape = 'circle' | 'rounded';

@Component({
  selector: 'app-photo-cropper',
  templateUrl: './photo-cropper.html',
  styleUrl: './photo-cropper.scss',
  host: { '(document:keydown.escape)': 'cancel()' },
})
export class PhotoCropper {
  readonly file = input.required<File>();
  readonly shape = input<CropShape>('circle');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly cancelled = output<void>();
  readonly saved = output<Blob>();

  protected readonly maxZoom = MAX_ZOOM;
  protected readonly src = signal<string | null>(null);
  protected readonly frame = signal<Frame>({ zoom: 1, x: 0, y: 0 });
  protected readonly loadFailed = signal(false);
  protected readonly exportFailed = signal(false);
  private readonly natural = signal<{ width: number; height: number } | null>(null);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly slider = viewChild<ElementRef<HTMLInputElement>>('slider');
  private image: HTMLImageElement | null = null;
  private drag: { pointerId: number; startX: number; startY: number; from: Frame } | null = null;

  protected readonly imageStyle = computed(() => {
    const size = this.natural();
    if (!size) {
      return null;
    }
    const frame = this.frame();
    const { w, h } = frameSize(size.width, size.height, frame.zoom);
    return {
      width: `${w * 100}%`,
      height: `${h * 100}%`,
      left: `${frame.x * 100}%`,
      top: `${frame.y * 100}%`,
    };
  });

  constructor() {
    effect((onCleanup) => {
      const url = URL.createObjectURL(this.file());
      this.loadFailed.set(false);
      this.natural.set(null);
      this.src.set(url);
      const image = new Image();
      image.onload = () => {
        this.image = image;
        this.natural.set({ width: image.naturalWidth, height: image.naturalHeight });
        this.frame.set(centeredFrame(image.naturalWidth, image.naturalHeight));
      };
      image.onerror = () => this.loadFailed.set(true);
      image.src = url;
      onCleanup(() => URL.revokeObjectURL(url));
    });
    afterNextRender(() => this.slider()?.nativeElement.focus());
  }

  protected cancel(): void {
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }

  protected setZoom(zoom: number): void {
    const size = this.natural();
    if (size) {
      this.frame.set(zoomFrame(this.frame(), zoom, size.width, size.height));
    }
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.setZoom(this.frame().zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.natural() || this.busy()) {
      return;
    }
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, from: this.frame() };
  }

  protected onPointerMove(event: PointerEvent): void {
    const size = this.natural();
    const side = this.viewport()?.nativeElement.clientWidth;
    if (!this.drag || this.drag.pointerId !== event.pointerId || !size || !side) {
      return;
    }
    const { from, startX, startY } = this.drag;
    this.frame.set(
      clampFrame(
        { zoom: from.zoom, x: from.x + (event.clientX - startX) / side, y: from.y + (event.clientY - startY) / side },
        size.width,
        size.height,
      ),
    );
  }

  protected onPointerUp(): void {
    this.drag = null;
  }

  /** Setas movem a imagem; + e - mudam o zoom: o corte tambem funciona sem mouse. */
  protected onKeydown(event: KeyboardEvent): void {
    const size = this.natural();
    if (!size) {
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [KEY_STEP, 0],
      ArrowRight: [-KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    };
    const frame = this.frame();
    if (event.key in moves) {
      const [dx, dy] = moves[event.key];
      this.frame.set(clampFrame({ ...frame, x: frame.x + dx, y: frame.y + dy }, size.width, size.height));
    } else if (event.key === '+' || event.key === '=') {
      this.setZoom(frame.zoom + 0.1);
    } else if (event.key === '-') {
      this.setZoom(frame.zoom - 0.1);
    } else {
      return;
    }
    event.preventDefault();
  }

  protected save(): void {
    const size = this.natural();
    if (!this.image || !size || this.busy()) {
      return;
    }
    this.exportFailed.set(false);
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_OUTPUT_SIZE;
    canvas.height = PHOTO_OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      this.exportFailed.set(true);
      return;
    }
    const { sx, sy, sw, sh } = sourceRect(this.frame(), size.width, size.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(this.image, sx, sy, sw, sh, 0, 0, PHOTO_OUTPUT_SIZE, PHOTO_OUTPUT_SIZE);
    // Navegador sem WEBP no canvas devolve PNG pesado; nesse caso cai para JPEG.
    canvas.toBlob(
      (blob) => {
        if (blob?.type === 'image/webp') {
          this.saved.emit(blob);
          return;
        }
        canvas.toBlob((jpeg) => (jpeg ? this.saved.emit(jpeg) : this.exportFailed.set(true)), 'image/jpeg', 0.9);
      },
      'image/webp',
      0.9,
    );
  }
}
