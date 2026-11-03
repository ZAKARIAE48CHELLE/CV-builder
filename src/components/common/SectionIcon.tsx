import React from "react";
import {
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  User,
  Globe,
  Award,
  Trophy,
  BookOpen,
  Heart,
  Sparkles,
  Users,
  Star,
  CheckCircle2,
  Code,
  Zap,
  Shield,
  Target,
  Cpu,
  Flame,
  Terminal,
  Layers,
  FileText,
  ListPlus,
  Compass,
  Bookmark,
  BadgeCheck,
  Send,
  Coffee,
  Lightbulb,
} from "lucide-react";

export interface SectionIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const AVAILABLE_SECTION_ICONS: {
  id: string;
  label: string;
  icon: React.ComponentType<SectionIconProps>;
}[] = [
  { id: "Briefcase", label: "Experience", icon: Briefcase },
  { id: "GraduationCap", label: "Education", icon: GraduationCap },
  { id: "Wrench", label: "Skills", icon: Wrench },
  { id: "FolderGit2", label: "Projects", icon: FolderGit2 },
  { id: "User", label: "Summary", icon: User },
  { id: "Globe", label: "Languages", icon: Globe },
  { id: "Award", label: "Certifications", icon: Award },
  { id: "Trophy", label: "Awards", icon: Trophy },
  { id: "BookOpen", label: "Publications", icon: BookOpen },
  { id: "Heart", label: "Volunteering", icon: Heart },
  { id: "Sparkles", label: "Interests", icon: Sparkles },
  { id: "Users", label: "References", icon: Users },
  { id: "Star", label: "Star", icon: Star },
  { id: "CheckCircle2", label: "Verified", icon: CheckCircle2 },
  { id: "Code", label: "Code", icon: Code },
  { id: "Zap", label: "Strengths", icon: Zap },
  { id: "Shield", label: "Security", icon: Shield },
  { id: "Target", label: "Goals", icon: Target },
  { id: "Cpu", label: "Tech", icon: Cpu },
  { id: "Flame", label: "Passions", icon: Flame },
  { id: "Terminal", label: "Terminal", icon: Terminal },
  { id: "Layers", label: "Layers", icon: Layers },
  { id: "Compass", label: "Compass", icon: Compass },
  { id: "Bookmark", label: "Bookmark", icon: Bookmark },
  { id: "BadgeCheck", label: "Badge", icon: BadgeCheck },
  { id: "Send", label: "Send", icon: Send },
  { id: "Coffee", label: "Coffee", icon: Coffee },
  { id: "Lightbulb", label: "Ideas", icon: Lightbulb },
  { id: "ListPlus", label: "Custom", icon: ListPlus },
];

export const ICON_COMPONENT_MAP: Record<string, React.ComponentType<SectionIconProps>> = {
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  User,
  Globe,
  Award,
  Trophy,
  BookOpen,
  Heart,
  Sparkles,
  Users,
  Star,
  CheckCircle2,
  Code,
  Zap,
  Shield,
  Target,
  Cpu,
  Flame,
  Terminal,
  Layers,
  Compass,
  Bookmark,
  BadgeCheck,
  Send,
  Coffee,
  Lightbulb,
  ListPlus,
  FileText,
};

export function getSectionIconComponent(iconName?: string) {
  if (!iconName || iconName === "none") return null;
  return ICON_COMPONENT_MAP[iconName] || null;
}
