"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useApiMutation } from "../hooks/useApiMutation";

const DocumentScan = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<"single" | "batch">("single");
  const ocrMutation = useApiMutation<string, FormData>({
    path: "/multi-agent-ocr",
    method: "POST",
    config: { responseType: "text" },
  });
  const isUploading = ocrMutation.isPending;

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Only image capture is supported in this build.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setImagePreview(result);
      setError(null);
      if (!result) {
        return;
      }
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage?.setItem("scannedImageDataUrl", result);
          window.localStorage?.setItem("scannedImageDataUrl", result);
        }
      } catch (storageError) {
        console.warn(
          "Unable to store preview in session storage",
          storageError
        );
      }
    };
    reader.onerror = () => setError("Failed to read image. Please try again.");
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, base64] = dataUrl.split(",");
    const mimeMatch = /data:(.*?);base64/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
  };

  const handleProcess = async () => {
    if (!imagePreview) {
      setError("Capture or upload a document first.");
      return;
    }

    ocrMutation.reset();
    setError(null);

    try {
      const blob = dataUrlToBlob(imagePreview);
      const formData = new FormData();
      formData.append("file", blob, "scanned_image.png");
      formData.append("source", "camera_capture");
      formData.append("timestamp", new Date().toISOString());

      const textBody = await ocrMutation.mutateAsync(formData);

      let parsedResult: unknown = null;
      try {
        parsedResult =
          typeof textBody === "string" ? JSON.parse(textBody) : textBody;
      } catch (parseError) {
        console.warn(
          "Failed to parse OCR response as JSON, storing raw text",
          parseError
        );
      }

      const serialized = parsedResult
        ? JSON.stringify(parsedResult)
        : String(textBody ?? "");

      if (typeof window !== "undefined") {
        window.sessionStorage?.setItem("ocrResultData", serialized);
        window.localStorage?.setItem("ocrResultData", serialized);
      }

      router.push("/documents/details");
    } catch (uploadError) {
      const normalizedError =
        uploadError instanceof Error
          ? uploadError
          : new Error(String(uploadError));
      console.error(normalizedError);
      setError(normalizedError.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div className="group/design-root relative flex min-h-screen flex-col justify-between bg-[#111827] pb-24 text-white">
      <div className="mt-8 flex flex-1 flex-col">
        <header className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() =>
              setError("Flash toggle is not available in this build.")
            }
          >
            <span className="material-symbols-outlined">flash_on</span>
          </Button>
          <h2 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em]">
            Scan Document
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/dashboard")}
          >
            <span className="material-symbols-outlined">close</span>
          </Button>
        </header>

        <main className="flex flex-1 flex-col items-center px-4">
          <div className="mt-4 flex w-full flex-1 items-center justify-center">
            <Card className="relative flex aspect-[3/4] w-full max-w-sm items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-white/25 bg-[#2f3649]/70">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Captured document"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center px-8 text-center text-sm text-white/80">
                  <p>
                    Position document within the frame
                    <br />
                    Then press the capture button
                  </p>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/10" />

              <Button
                variant="secondary"
                size="icon"
                className="pointer-events-auto absolute bottom-4 left-4 rounded-full bg-white/15 text-white hover:bg-white/25"
                onClick={imagePreview ? handleRetake : handleSelectFile}
                disabled={isUploading}
              >
                <span className="material-symbols-outlined">
                  {imagePreview ? "refresh" : "photo_library"}
                </span>
              </Button>

              <Button
                size="icon"
                className="pointer-events-auto absolute bottom-4 right-4 rounded-full bg-[var(--primary-color)] text-[#111827] hover:bg-[var(--primary-color)]/90"
                onClick={handleProcess}
                disabled={!imagePreview || isUploading}
              >
                <span className="material-symbols-outlined">check</span>
              </Button>
            </Card>
          </div>

          <div className="mt-8 flex w-full max-w-xs items-center justify-between rounded-full bg-[#0b1324] p-1 text-sm font-medium">
            {(["single", "batch"] as const).map((mode) => {
              const isActive = captureMode === mode;
              return (
                <Button
                  key={mode}
                  variant={isActive ? "default" : "ghost"}
                  className={`flex-1 rounded-full ${
                    isActive
                      ? "bg-white text-[#111827] hover:bg-white"
                      : "text-white/60 hover:bg-white/10"
                  }`}
                  onClick={() => setCaptureMode(mode)}
                >
                  {mode === "single" ? "Single" : "Batch"}
                </Button>
              );
            })}
          </div>

          <div className="mt-8 mb-6 flex items-center justify-center gap-12">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-[#1f2736] text-white hover:bg-[#253048]"
              onClick={handleSelectFile}
              disabled={isUploading}
            >
              <span className="material-symbols-outlined">photo_library</span>
            </Button>
            <Button
              size="icon"
              className="h-20 w-20 rounded-full bg-white text-[#111827] shadow-[0_12px_28px_rgba(12,15,30,0.55)] hover:bg-white"
              onClick={handleSelectFile}
              disabled={isUploading}
            >
              <span className="material-symbols-outlined text-3xl text-[#0f172a]">camera</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-[#1f2736] text-white hover:bg-[#253048]"
              onClick={handleProcess}
              disabled={!imagePreview || isUploading}
            >
              <span className="material-symbols-outlined">description</span>
            </Button>
          </div>
        </main>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && (
          <div className="px-4 pb-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default DocumentScan;
