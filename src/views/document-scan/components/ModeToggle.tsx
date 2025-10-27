import { Button } from "@/src/components/ui/button";

type CaptureMode = "single" | "batch";

type ModeToggleProps = {
  captureMode: CaptureMode;
  onSelect: (mode: CaptureMode) => void;
  isUploading: boolean;
  t: (key: string) => string;
};

export const ModeToggle = ({
  captureMode,
  onSelect,
  isUploading,
  t,
}: ModeToggleProps) => (
  <div className="flex w-full max-w-xs items-center justify-between rounded-full bg-[#0b1324] p-1 text-sm font-medium">
    {(["single", "batch"] as const).map((mode) => {
      const isActive = captureMode === mode;
      const labelKey =
        mode === "single"
          ? "documentScan.captureMode.single"
          : "documentScan.captureMode.batch";
      return (
        <Button
          key={mode}
          variant={isActive ? "default" : "ghost"}
          className={`flex-1 rounded-full ${
            isActive
              ? "bg-white text-[#111827] hover:bg-white"
              : "text-white/60 hover:bg-white/10"
          }`}
          onClick={() => onSelect(mode)}
          disabled={isUploading || mode === "batch"}
        >
          {t(labelKey)}
        </Button>
      );
    })}
  </div>
);

