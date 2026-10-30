export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ImageRegion extends Point, Size {}

/** Pan is measured in viewport pixels, relative to the centered image. */
export interface ViewTransform extends Point {
  scale: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 5;
export const INITIAL_VIEW: ViewTransform = { scale: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function fittedSize(image: Size, viewport: Size): Size {
  if (image.width <= 0 || image.height <= 0) return { width: 0, height: 0 };
  const ratio = Math.min(
    viewport.width / image.width,
    viewport.height / image.height,
  );
  return { width: image.width * ratio, height: image.height * ratio };
}

/** A smaller image axis stays centered; a larger axis can never uncover an edge. */
export function constrainView(
  view: ViewTransform,
  image: Size,
  viewport: Size,
): ViewTransform {
  const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE);
  const fitted = fittedSize(image, viewport);
  const boundX = Math.max(0, (fitted.width * scale - viewport.width) / 2);
  const boundY = Math.max(0, (fitted.height * scale - viewport.height) / 2);
  return {
    scale,
    x: boundX ? clamp(view.x, -boundX, boundX) : 0,
    y: boundY ? clamp(view.y, -boundY, boundY) : 0,
  };
}

/** Keep the image position under the gesture's previous midpoint under its new midpoint. */
export function transformGesture(
  view: ViewTransform,
  image: Size,
  viewport: Size,
  previous: Point,
  next: Point,
  scaleRatio: number,
): ViewTransform {
  const scale = clamp(view.scale * scaleRatio, MIN_SCALE, MAX_SCALE);
  const ratio = scale / view.scale;
  return constrainView(
    {
      scale,
      x:
        next.x -
        viewport.width / 2 -
        (previous.x - viewport.width / 2 - view.x) * ratio,
      y:
        next.y -
        viewport.height / 2 -
        (previous.y - viewport.height / 2 - view.y) * ratio,
    },
    image,
    viewport,
  );
}

export function focusRegion(
  region: ImageRegion,
  image: Size,
  viewport: Size,
): ViewTransform {
  const fitted = fittedSize(image, viewport);
  if (!fitted.width || !fitted.height) return INITIAL_VIEW;
  const scale = clamp(
    Math.min(
      (viewport.width * 0.72) / (region.width * fitted.width),
      (viewport.height * 0.72) / (region.height * fitted.height),
    ),
    MIN_SCALE,
    MAX_SCALE,
  );
  return constrainView(
    {
      scale,
      x: -(region.x + region.width / 2 - 0.5) * fitted.width * scale,
      y: -(region.y + region.height / 2 - 0.5) * fitted.height * scale,
    },
    image,
    viewport,
  );
}

export function regionCenter(
  region: ImageRegion,
  view: ViewTransform,
  image: Size,
  viewport: Size,
): Point {
  const fitted = fittedSize(image, viewport);
  return {
    x:
      viewport.width / 2 +
      view.x +
      (region.x + region.width / 2 - 0.5) * fitted.width * view.scale,
    y:
      viewport.height / 2 +
      view.y +
      (region.y + region.height / 2 - 0.5) * fitted.height * view.scale,
  };
}
