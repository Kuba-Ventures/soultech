import {
  siClaude,
  siCursor,
  siNotion,
  siRaycast,
  siGoogledrive,
  siGooglecalendar,
  siGmail,
  siGooglegemini,
  siSpotify,
  siLetterboxd,
  siApple,
} from "simple-icons";
import { Landmark, MapPin, Webhook, Bot, Sparkles, type LucideIcon } from "lucide-react";

type SimpleIcon = { path: string };

// Real brand marks (simple-icons). OpenAI/LinkedIn/Plaid were removed from
// simple-icons (trademark); LinkedIn and OpenAI are hand-authored below, the
// rest use lucide generics.
const SI: Record<string, SimpleIcon> = {
  claude: siClaude,
  cursor: siCursor,
  notion: siNotion,
  raycast: siRaycast,
  googledrive: siGoogledrive,
  googlecalendar: siGooglecalendar,
  gmail: siGmail,
  gemini: siGooglegemini,
  spotify: siSpotify,
  letterboxd: siLetterboxd,
  apple: siApple,
};

// Hand-authored 24x24 paths for brands absent from simple-icons.
const CUSTOM: Record<string, string> = {
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  // OpenAI/ChatGPT mark, hand-carried since simple-icons dropped it (trademark).
  chatgpt:
    "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z",
};

const LU: Record<string, LucideIcon> = {
  ai: Bot,
  other: Sparkles,
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
