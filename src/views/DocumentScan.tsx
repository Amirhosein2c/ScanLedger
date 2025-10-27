"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import AppLayout from "../components/layout/AppLayout";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";

import { CaptureBar } from "./document-scan/components/CaptureBar";
import { ModeToggle } from "./document-scan/components/ModeToggle";
import { ScanHeader } from "./document-scan/components/ScanHeader";
import { ScanViewport } from "./document-scan/components/ScanViewport";
import { useCamera } from "./document-scan/hooks/useCamera";
import { useFilePreview } from "./document-scan/hooks/useFilePreview";
import { useOcrUpload } from "./document-scan/hooks/useOcrUpload";

const DocumentScan = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);

  const [captureMode, setCaptureMode] = useState<"single" | "batch">("single");
  const [error, setError] = useState<string | null>(null);

  const { isUploading, submitDocumentForOcr, processImageDataUrl } =
    useOcrUpload({
      t,
      onError: setError,
    });

  const {
    imagePreview,
    imagePreviewSource,
    pendingFileUpload,
    setPreview,
    clearPreview,
    readFileAsPreview,
  } = useFilePreview({
    t,
    onError: setError,
    onProcessImageDataUrl: processImageDataUrl,
  });

  const {
    videoRef,
    isCameraReady,
    cameraError,
    isFlashOn,
    isTorchAvailable,
    isTogglingFlash,
    toggleFlash,
    captureImage,
    resetCamera,
    resumeCamera,
    clearCameraError,
  } = useCamera({
    t,
    onError: setError,
  });

  useEffect(() => {
    if (imagePreview) {
      return;
    }

    resumeCamera();
  }, [imagePreview, resumeCamera]);

  useEffect(() => {
    const activeMessage = error || cameraError;
    if (!activeMessage) {
      return;
    }
    toast.error(activeMessage);
  }, [error, cameraError]);

  const handleToggleFlash = () => {
    void toggleFlash();
  };

  const handleSelectFile = () => {
    const input = galleryInputRef.current;
    if (!input) {
      return;
    }

    input.value = "";
    input.removeAttribute("capture");
    input.click();
  };

  const handleCapture = () => {
    const dataUrl = captureImage();
    if (!dataUrl) {
      return;
    }

    setPreview(dataUrl, "camera_capture");
    clearCameraError();
  };

  const handleProcess = async () => {
    if (pendingFileUpload) {
      await submitDocumentForOcr(pendingFileUpload, {
        source: "file_upload",
        fileName: pendingFileUpload.name || "uploaded_document",
      });
      return;
    }

    if (!imagePreview) {
      const input = generalFileInputRef.current;
      if (!input) {
        setError(t("documentScan.errors.noPreview"));
        return;
      }

      input.value = "";
      input.click();
      return;
    }

    await processImageDataUrl(imagePreview, imagePreviewSource);
  };

  const handleGalleryFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { current } = galleryInputRef;
    if (current) {
      current.removeAttribute("capture");
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void readFileAsPreview(file, { source: "gallery_upload" });
    event.target.value = "";
  };

  const handleGeneralFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void readFileAsPreview(file, { source: "file_upload" });
    event.target.value = "";
  };

  const handleRetake = () => {
    clearPreview();
    clearCameraError();
    setError(null);

    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
      galleryInputRef.current.removeAttribute("capture");
    }
    if (generalFileInputRef.current) {
      generalFileInputRef.current.value = "";
    }

    resetCamera();
  };

  const header = (
    <ScanHeader
      title={t("documentScan.header.title")}
      isFlashOn={isFlashOn}
      isTorchAvailable={isTorchAvailable}
      isTogglingFlash={isTogglingFlash}
      isUploading={isUploading}
      onToggleFlash={handleToggleFlash}
      onClose={() => router.push("/dashboard")}
      flashUnsupportedMessage={t("documentScan.errors.flashUnsupported")}
    />
  );

  return (
    <AppLayout
      header={header}
      className="bg-[#111827] text-white h-[100dvh] max-h-[100dvh] overflow-hidden"
      contentClassName="flex flex-1 min-h-0 flex-col gap-4 pb-24"
      isContentScrollable={false}
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex flex-1 min-h-0 flex-col items-center gap-4">
          <div className="flex w-full flex-1 min-h-0 items-center justify-center">
            <ScanViewport
              imagePreview={imagePreview}
              pendingFileUpload={pendingFileUpload}
              cameraError={cameraError}
              videoRef={videoRef}
              isCameraReady={isCameraReady}
              isUploading={isUploading}
              onRetake={handleRetake}
              onProcess={() => {
                void handleProcess();
              }}
              t={t}
            />
          </div>

          <ModeToggle
            captureMode={captureMode}
            onSelect={setCaptureMode}
            isUploading={isUploading}
            t={t}
          />
        </div>

        <CaptureBar
          onSelectFile={handleSelectFile}
          onCapture={handleCapture}
          onProcess={() => {
            void handleProcess();
          }}
          isUploading={isUploading}
          isCameraReady={isCameraReady}
        />

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleGalleryFileChange}
        />
        <input
          ref={generalFileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleGeneralFileChange}
        />
      </div>
    </AppLayout>
  );
};

export default DocumentScan;
