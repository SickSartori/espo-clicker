/**
 * Lucide icons — inject only the icons we use.
 * Replaces <i data-lucide="name"> elements with inline SVG.
 *
 * Strategy:
 * - Tree-shakable: import only icons actually used in markup
 * - On DOMContentLoaded: scan [data-lucide] and replace with SVG
 * - Re-runnable: safe to call multiple times after DOM mutations
 */

import { createIcons,
  // Navbar
  BookOpen,
  ChartLine,
  Gamepad2,
  Award,
  Palette,
  Trophy,
  Zap,
  Sliders,
  // Tabs
  MousePointer2,
  Cog,
  FlaskConical,
  Atom,
  // Header / score
  Bug,
  Coins,
  Boxes,
  // Stats / panels
  Users,
  TrendingUp,
  // Common UI
  X,
  Check,
  Lock,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Bell,
  Music,
  Download,
  Save,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  Sparkles,
  Rocket,
  Star,
  Crown,
  Gem,
  Heart,
} from 'lucide';

/* Lucide internally converts data-lucide value via toPascalCase(),
   so keys MUST match the PascalCase component names. */
const ICONS = {
  BookOpen,
  ChartLine,
  Gamepad2,
  Award,
  Palette,
  Trophy,
  Zap,
  Sliders,
  MousePointer2,
  Cog,
  FlaskConical,
  Atom,
  Bug,
  Coins,
  Boxes,
  Users,
  TrendingUp,
  X,
  Check,
  Lock,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Bell,
  Music,
  Download,
  Save,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  Sparkles,
  Rocket,
  Star,
  Crown,
  Gem,
  Heart,
};

let initialized = false;

/**
 * Render all <i data-lucide="..."> in the page as inline SVG.
 * Call after DOMContentLoaded and after any DOM mutation that adds data-lucide.
 */
export function renderLucideIcons(): void {
  try {
    createIcons({
      icons: ICONS as never,
      attrs: {
        'stroke-width': '2',
        'class': 'lucide-icon',
      },
    });
  } catch (e) {
    console.warn('[lucide] render failed', e);
  }
}

/** Auto-init at boot + observe DOM mutations for dynamically-added icons. */
export function autoInitLucide(): void {
  if (initialized) return;
  initialized = true;

  const start = () => {
    renderLucideIcons();
    setupMutationObserver();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // Catch icons added by legacy bundle after boot
  setTimeout(renderLucideIcons, 500);
  setTimeout(renderLucideIcons, 1500);
}

/**
 * Watch for new [data-lucide] elements added by legacy code (modal renders,
 * dynamic content) and replace them. Throttled to avoid hot loops.
 */
function setupMutationObserver(): void {
  if (typeof MutationObserver === 'undefined') return;

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      // Only render if any unprocessed [data-lucide] exists
      if (document.querySelector('[data-lucide]')) {
        renderLucideIcons();
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          const el = node as Element;
          if (el.matches?.('[data-lucide]') || el.querySelector?.('[data-lucide]')) {
            schedule();
            return;
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
