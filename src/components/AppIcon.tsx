import type { ComponentProps } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  Images,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Scan,
  Search,
  Settings,
  X,
  Zap,
} from "lucide-react";

const ICON_MAP = {
  arrow_back: ArrowLeft,
  arrow_back_ios_new: ChevronLeft,
  camera: Camera,
  camera_alt: Camera,
  check: Check,
  chevron_right: ChevronRight,
  chevron_down: ChevronDown,
  close: X,
  dashboard: LayoutDashboard,
  description: FileText,
  edit: Pencil,
  folder: Folder,
  flash_on: Zap,
  keyboard_arrow_down: ChevronDown,
  logout: LogOut,
  photo_library: Images,
  plus: Plus,
  add: Plus,
  qr_code_scanner: Scan,
  search: Search,
  settings: Settings,
  swap_vert: ArrowUpDown,
} as const;

type IconKey = keyof typeof ICON_MAP;

interface AppIconProps extends ComponentProps<"svg"> {
  name: IconKey;
}

export const AppIcon = ({ name, className, ...props }: AppIconProps) => {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} {...props} />;
};

export type { IconKey as AppIconName };
