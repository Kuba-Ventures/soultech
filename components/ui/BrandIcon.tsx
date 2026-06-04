import {
  siClaude,
  siCursor,
  siNotion,
  siRaycast,
  siGoogledrive,
  siGooglecalendar,
  siGmail,
  siSpotify,
  siLetterboxd,
  siApple,
} from "simple-icons";
import { Landmark, MapPin, Webhook, Bot, type LucideIcon } from "lucide-react";

type SimpleIcon = { path: string };

// Real brand marks (simple-icons). OpenAI/LinkedIn/Plaid were removed from
// simple-icons (trademark); LinkedIn is hand-authored below, the rest use
// lucide generics.
const SI: Record<string, SimpleIcon> = {
  claude: siClaude,
  cursor: siCursor,
  notion: siNotion,
  raycast: siRaycast,
  googledrive: siGoogledrive,
  googlecalendar: siGooglecalendar,
  gmail: siGmail,
  spotify: siSpotify,
  letterboxd: siLetterboxd,
  apple: siApple,
};

// Hand-authored 24x24 paths for brands absent from simple-icons.
const CUSTOM: Record<string, string> = {
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
};

const LU: Record<string, LucideIcon> = {
  chatgpt: Bot,
  plaid: Landmark,
  location: MapPin,
  api: Webhook,
};

/**
 * Renders the real logo for a connector when known; otherwise the lucide
 * fallback; otherwise the provided letter `fallback`. Inherits color, so it
 * sits white inside the colored connector badge.
 */
export function BrandIcon({
  brand,
  size = 18,
  fallback,
}: {
  brand: string;
  size?: number;
  fallback?: string;
}) {
  const path = SI[brand]?.path ?? CUSTOM[brand];
  if (path) {
    return (
      <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d={path} />
      </svg>
    );
  }
  const L = LU[brand];
  if (L) return <L size={size} strokeWidth={1.9} />;
  return fallback ? <>{fallback}</> : null;
}
