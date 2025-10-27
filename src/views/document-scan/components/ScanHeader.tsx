import { Button } from "@/src/components/ui/button";

type ScanHeaderProps = {
  title: string;
  isFlashOn: boolean;
  isTorchAvailable: boolean;
  isTogglingFlash: boolean;
  isUploading: boolean;
  onToggleFlash: () => void;
  onClose: () => void;
  flashUnsupportedMessage?: string;
};

export const ScanHeader = ({
  title,
  isFlashOn,
  isTorchAvailable,
  isTogglingFlash,
  isUploading,
  onToggleFlash,
  onClose,
  flashUnsupportedMessage,
}: ScanHeaderProps) => (
  <div className="flex items-center justify-between">
    <Button
      variant="ghost"
      size="icon"
      className={`rounded-full hover:bg-white/10 hover:text-white ${
        isFlashOn ? "text-white" : "text-white/70"
      } ${!isTorchAvailable ? "opacity-60" : ""}`}
      onClick={onToggleFlash}
      aria-pressed={isFlashOn}
      disabled={isTogglingFlash || isUploading}
      title={!isTorchAvailable ? flashUnsupportedMessage : undefined}
    >
      <span className="material-symbols-outlined">flash_on</span>
    </Button>
    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
      {title}
    </h2>
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
      onClick={onClose}
    >
      <span className="material-symbols-outlined">close</span>
    </Button>
  </div>
);

