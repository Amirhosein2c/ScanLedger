/* eslint-disable @next/next/no-img-element */

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
      <img
        src={imagePreview}
        alt={t("documentScan.previewAlt")}
        className="h-full w-full object-contain"
      />
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

