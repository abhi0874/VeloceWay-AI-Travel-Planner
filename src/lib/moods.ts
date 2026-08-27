import {
  MountainSnow,
  Palmtree,
  UtensilsCrossed,
  Landmark,
  MoonStar,
  Trees,
  Heart,
  Flower2,
  Camera,
  Flower,
  Sun,
  Leaf,
  Snowflake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MoodDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const MOODS: MoodDef[] = [
  { id: "adventure", label: "Adventure", icon: MountainSnow },
  { id: "relax", label: "Slow & easy", icon: Palmtree },
  { id: "food", label: "Food first", icon: UtensilsCrossed },
  { id: "culture", label: "Culture", icon: Landmark },
  { id: "nightlife", label: "After dark", icon: MoonStar },
  { id: "nature", label: "Nature", icon: Trees },
  { id: "romance", label: "Romance", icon: Heart },
  { id: "spiritual", label: "Spiritual", icon: Flower2 },
  { id: "photography", label: "Photography", icon: Camera },
];

export interface SeasonDef {
  id: string;
  label: string;
  months: string[];
  icon: LucideIcon;
}

export const SEASONS: SeasonDef[] = [
  { id: "Spring", label: "Spring", months: ["March", "April", "May"], icon: Flower },
  { id: "Summer", label: "Summer", months: ["June", "July", "August"], icon: Sun },
  { id: "Autumn", label: "Autumn", months: ["September", "October", "November"], icon: Leaf },
  { id: "Winter", label: "Winter", months: ["December", "January", "February"], icon: Snowflake },
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
