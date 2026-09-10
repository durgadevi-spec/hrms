// Icon name to component mapping
// Database stores icon names as strings, this maps them to actual Lucide React icons
import {
  Laptop, Smartphone, CreditCard, Key, Package, Monitor, Router as RouterIcon,
  Armchair, Briefcase, LucideIcon
} from 'lucide-react';

export const iconNameToComponent: Record<string, LucideIcon> = {
  laptop: Laptop,
  smartphone: Smartphone,
  creditcard: CreditCard,
  key: Key,
  package: Package,
  monitor: Monitor,
  router: RouterIcon,
  chair: Armchair,
  briefcase: Briefcase,
};

/**
 * Get icon component from icon name (from database)
 * Falls back to Package icon if name not found
 */
export const getIconComponent = (iconName: string | undefined | null): LucideIcon => {
  if (!iconName) return Package;
  const name = String(iconName).toLowerCase().trim();
  return iconNameToComponent[name] || Package;
};
