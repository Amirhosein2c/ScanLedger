import Image from "next/image";

type PreviewCardProps = {
  imagePreview: string | null;
  pendingFileUpload: File | null;
  cameraError: string | null;
  t: (key: string) => string;
};

export const PreviewCard = ({
  imagePreview,
  pendingFileUpload,
  cameraError,
  t,
}: PreviewCardProps) => {
  if (imagePreview) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={imagePreview}
          alt={t("documentScan.previewAlt")}
          fill
          className="object-contain"
          unoptimized
          sizes="(max-width: 640px) 100vw, 384px"
        />
      </div>
    );
  }

  if (pendingFileUpload) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-8 text-center text-sm text-white/80">
        <span className="material-symbols-outlined text-5xl text-white/70">
          description
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold text-white">
            {pendingFileUpload.name || t("documentScan.filePreview.untitled")}
          </p>
          <p className="text-xs text-white/60">
            {t("documentScan.filePreview.prompt")}
          </p>
        </div>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center px-8 text-center text-sm text-white/80">
        <p>{cameraError}</p>
      </div>
    );
  }

  return null;
};
