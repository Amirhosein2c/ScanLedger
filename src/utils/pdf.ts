type DocumentInitParameters =
  import("pdfjs-dist/types/src/display/api").DocumentInitParameters;
type RenderParameters =
  import("pdfjs-dist/types/src/display/api").RenderParameters;

const PDF_WORKER_SRC = "/pdf.worker.min.js";
const MAX_WIDTH = 1600; // محدودیت عرض برای جلوگیری از مصرف غیرمنطقی رم

type PdfJsModule = Awaited<typeof import("pdfjs-dist/legacy/build/pdf.js")>;

const loadPdfJsClient = (() => {
  let memoized: Promise<PdfJsModule> | null = null;

  return async () => {
    if (typeof window === "undefined") {
      throw new Error("PDF conversion is only supported in the browser.");
    }

    if (!memoized) {
      memoized = import("pdfjs-dist/legacy/build/pdf.js").then((module) => {
        const { GlobalWorkerOptions } = module;
        const workerSrc = new URL(
          PDF_WORKER_SRC,
          window.location.origin
        ).toString();

        let shouldConfigureWorker = true;
        try {
          shouldConfigureWorker = GlobalWorkerOptions.workerSrc !== workerSrc;
        } catch {
          // دسترسی به workerSrc تا زمانی که مقداردهی نشده باشد throw می‌کند.
        }

        if (shouldConfigureWorker) {
          GlobalWorkerOptions.workerSrc = workerSrc;
        }

        return module;
      });
    }

    return memoized;
  };
})();

const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number
): Promise<Blob> => {
  if (typeof canvas.toBlob === "function") {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Failed to export canvas.")),
        type,
        quality
      );
    });
  }

  const dataUrl = canvas.toDataURL(type, quality);
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error("Failed to convert canvas to Blob.");
  }
  return await response.blob();
};

export async function convertPdfToImage(
  file: File
): Promise<{ dataUrl: string; imageFile: File }> {
  if (typeof window === "undefined") {
    throw new Error("PDF conversion is only supported in the browser.");
  }
  if (!file || file.type !== "application/pdf") {
    throw new Error("Please provide a PDF file.");
  }

  const pdfjs = await loadPdfJsClient();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: buffer,
  } as DocumentInitParameters);
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);

    // مقیاس‌دهی: شفاف ولی منطقی
    const base = page.getViewport({ scale: 1 });
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const scaleByWidth = MAX_WIDTH / base.width;
    const scale = Math.max(1, Math.min(scaleByWidth * dpr, 2 * dpr));
    const viewport = page.getViewport({ scale });

    // رندر به canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available.");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    } as RenderParameters).promise;

    // خروجی‌ها
    const dataUrl = canvas.toDataURL("image/png");
    const blob = await canvasToBlob(canvas, "image/png");
    const baseName = file.name.replace(/\.[^/.]+$/, "") || "uploaded_document";
    let imageFile: File;
    try {
      imageFile = new File([blob], `${baseName}.png`, {
        type: "image/png",
      });
    } catch {
      imageFile = blob as unknown as File;
    }

    // پاکسازی
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;

    return { dataUrl, imageFile };
  } finally {
    await pdf.destroy();
  }
}
