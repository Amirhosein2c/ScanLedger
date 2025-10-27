import type { RefObject } from "react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";

import { PreviewCard } from "./PreviewCard";

type ScanViewportProps = {
  imagePreview: string | null;
  pendingFileUpload: File | null;
  cameraError: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  isCameraReady: boolean;
  isUploading: boolean;
  onRetake: () => void;
  onProcess: () => void;
  t: (key: string) => string;
};

export const ScanViewport = ({
  imagePreview,
  pendingFileUpload,
  cameraError,
  videoRef,
  isCameraReady,
  isUploading,
  onRetake,
  onProcess,
  t,
}: ScanViewportProps) => {
  const disableActions =
    isUploading || (!imagePreview && !pendingFileUpload);
  const showVideo =
    !imagePreview && !pendingFileUpload && !cameraError;

  return (
    <Card className="relative flex aspect-[3/4] h-full max-h-full w-full max-w-sm items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-white/25 bg-[#2f3649]/70">
      {showVideo ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
          />
          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1324]/60 text-sm text-white/80 backdrop-blur-sm">
              {t("documentScan.status.initializingCamera")}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6 text-center text-sm text-white/80">
            <p>
              {t("documentScan.instructions.primary")}
              <br />
              {t("documentScan.instructions.secondary")}
            </p>
          </div>
        </>
      ) : (
        <PreviewCard
          imagePreview={imagePreview}
          pendingFileUpload={pendingFileUpload}
          cameraError={cameraError}
          t={t}
        />
      )}

      <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/10" />

      <Button
        variant="secondary"
        size="icon"
        className="pointer-events-auto absolute bottom-4 left-4 rounded-full bg-red-500 text-white hover:bg-red-500"
        onClick={onRetake}
        disabled={disableActions}
      >
        <span className="material-symbols-outlined">close</span>
      </Button>

      <Button
        size="icon"
        className="pointer-events-auto absolute bottom-4 right-4 rounded-full bg-[var(--primary-color)] text-[#111827] hover:bg-[var(--primary-color)]/90"
        onClick={onProcess}
        disabled={disableActions}
      >
        <span className="material-symbols-outlined">check</span>
      </Button>

      {isUploading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b1324]/80 px-6 text-center backdrop-blur-sm">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/20 border-t-[var(--primary-color)] animate-spin" />
          <p className="text-lg font-semibold text-white">
            {t("documentScan.progress.primary")}
            <br />
            {t("documentScan.progress.secondary")}
          </p>
          <p className="mt-3 text-sm text-white/70">
            {t("documentScan.progress.note")}
          </p>
        </div>
      )}
    </Card>
  );
};
