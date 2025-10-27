import { Button } from "@/src/components/ui/button";

type CaptureBarProps = {
  onSelectFile: () => void;
  onCapture: () => void;
  onProcess: () => void;
  isUploading: boolean;
  isCameraReady: boolean;
};

export const CaptureBar = ({
  onSelectFile,
  onCapture,
  onProcess,
  isUploading,
  isCameraReady,
}: CaptureBarProps) => (
  <div className="mt-4 flex items-center justify-center gap-12">
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 rounded-full bg-[#1f2736] text-white hover:bg-[#253048]"
      onClick={onSelectFile}
      disabled={isUploading}
    >
      <span className="material-symbols-outlined">photo_library</span>
    </Button>
    <Button
      size="icon"
      className="h-20 w-20 rounded-full bg-white text-[#111827] shadow-[0_12px_28px_rgba(12,15,30,0.55)] hover:bg-white"
      onClick={onCapture}
      disabled={isUploading || !isCameraReady}
    >
      <span className="material-symbols-outlined text-3xl text-[#0f172a]">
        camera
      </span>
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 rounded-full bg-[#1f2736] text-white hover:bg-[#253048]"
      onClick={onProcess}
      disabled={isUploading}
    >
      <span className="material-symbols-outlined">description</span>
    </Button>
  </div>
);

