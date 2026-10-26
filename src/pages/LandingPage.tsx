import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  FloatingIconsHero,
  type FloatingIconItem,
} from '../components/ui/floating-icons-hero-section';
import { LogIn } from 'lucide-react';

// --- 11 Exact SVG Icons Matching the Target HRMS Image ---

// 1. Calendar with Clock (Attendance & Schedules)
const IconCalendarClock: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Calendar Body */}
    <rect x="10" y="14" width="36" height="34" rx="8" fill="#3B82F6" />
    <rect x="10" y="14" width="36" height="10" rx="4" fill="#2563EB" />
    {/* Spiral bindings */}
    <rect x="17" y="10" width="4" height="7" rx="2" fill="#E2E8F0" />
    <rect x="35" y="10" width="4" height="7" rx="2" fill="#E2E8F0" />
    {/* Calendar Grid Dots */}
    <circle cx="18" cy="30" r="2" fill="#DBEAFE" />
    <circle cx="28" cy="30" r="2" fill="#DBEAFE" />
    <circle cx="38" cy="30" r="2" fill="#DBEAFE" />
    <circle cx="18" cy="38" r="2" fill="#DBEAFE" />
    <circle cx="28" cy="38" r="2" fill="#DBEAFE" />
    {/* Clock Badge (Orange) */}
    <circle cx="44" cy="42" r="12" fill="#F97316" stroke="#FFFFFF" strokeWidth="2.5" />
    <path d="M44 35V42L48 45" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 2. Beach Umbrella & Sun (Leaves & Vacations)
const IconLeavesBeach: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Warm Sun */}
    <circle cx="48" cy="18" r="7" fill="#EF4444" />
    {/* Umbrella Canopy */}
    <path d="M14 36C14 24 46 24 46 36H14Z" fill="#F97316" />
    <path d="M22 36C22 26 38 26 38 36H22Z" fill="#FBBF24" />
    {/* Umbrella Pole */}
    <path d="M30 36V48" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
    {/* Sand / Island Mound */}
    <ellipse cx="32" cy="50" rx="16" ry="5" fill="#3B82F6" opacity="0.85" />
    <ellipse cx="32" cy="49" rx="13" ry="3.5" fill="#60A5FA" />
  </svg>
);

// 3. Laptop (Asset & Device Management)
const IconLaptopAsset: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Screen Frame */}
    <rect x="14" y="16" width="36" height="24" rx="4" fill="#312E81" />
    {/* Screen Display */}
    <rect x="17" y="19" width="30" height="18" rx="2" fill="#4F46E5" />
    {/* Base Keyboard */}
    <path d="M8 43H56L51 47H13L8 43Z" fill="#4338CA" />
    <rect x="26" y="44" width="12" height="2" rx="1" fill="#818CF8" />
  </svg>
);

// 4. Laptop with Gear (IT Support & Maintenance)
const IconLaptopGear: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Screen Frame */}
    <rect x="11" y="20" width="36" height="23" rx="4" fill="#1E1B4B" />
    {/* Screen Display */}
    <rect x="14" y="23" width="30" height="17" rx="2" fill="#2563EB" />
    {/* Base */}
    <path d="M6 46H52L47 50H11L6 46Z" fill="#1D4ED8" />
    {/* Gear Badge */}
    <g transform="translate(37, 11)">
      <circle cx="11" cy="11" r="10" fill="#F97316" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="11" cy="11" r="4" fill="#FFFFFF" />
      {/* Gear teeth */}
      <rect x="9.5" y="0" width="3" height="4" rx="1" fill="#F97316" />
      <rect x="9.5" y="18" width="3" height="4" rx="1" fill="#F97316" />
      <rect x="0" y="9.5" width="4" height="3" rx="1" fill="#F97316" />
      <rect x="18" y="9.5" width="4" height="3" rx="1" fill="#F97316" />
    </g>
  </svg>
);

// 5. Employee Team / Duo Avatars (Employee Directory)
const IconEmployeeTeam: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Secondary Person (Green/Teal) */}
    <circle cx="43" cy="23" r="6" fill="#10B981" />
    <path d="M36 41C36 34.5 40 32 46 32C52 32 56 34.5 56 41V44H36V41Z" fill="#10B981" />
    {/* Primary Person (Blue/Indigo) */}
    <circle cx="23" cy="22" r="8" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2.5" />
    <path d="M12 43C12 34 16 31 24 31C32 31 36 34 36 43V46H12V43Z" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
  </svg>
);

// 6. Document with Bell Alert (Bills & Reminders)
const IconBillsReminder: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Alert lines / rays */}
    <path d="M47 13L51 10" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M51 17L56 16" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
    {/* Document Body */}
    <rect x="15" y="15" width="28" height="36" rx="6" fill="#2563EB" />
    {/* Document lines */}
    <rect x="21" y="23" width="16" height="2.5" rx="1.25" fill="#DBEAFE" />
    <rect x="21" y="29" width="16" height="2.5" rx="1.25" fill="#DBEAFE" />
    <rect x="21" y="35" width="10" height="2.5" rx="1.25" fill="#DBEAFE" />
    {/* Notification Bell Badge */}
    <g transform="translate(32, 34)">
      <circle cx="13" cy="13" r="11" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2.5" />
      <path d="M13 7C10.5 7 9.5 9 9.5 11.5V14L8 16.5H18L16.5 14V11.5C16.5 9 15.5 7 13 7Z" fill="#FFFFFF" />
      <circle cx="13" cy="18.5" r="1.5" fill="#FFFFFF" />
    </g>
  </svg>
);

// 7. Wallet with Coin (Payroll & Compensation)
const IconPayrollWallet: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Gold Dollar Coin */}
    <circle cx="36" cy="19" r="9" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
    <text x="36" y="23" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="sans-serif">$</text>
    {/* Wallet Body */}
    <rect x="13" y="25" width="38" height="26" rx="7" fill="#6366F1" />
    {/* Flap */}
    <path d="M13 29C13 26 15 25 18 25H44C47 25 49 26 49 29V32H13V29Z" fill="#4F46E5" />
    {/* Lock/Clasp */}
    <rect x="41" y="34" width="12" height="9" rx="3" fill="#E0E7FF" />
    <circle cx="46" cy="38.5" r="1.5" fill="#4338CA" />
  </svg>
);

// 8. Clipboard Checklist (Tasks & Projects)
const IconTasksChecklist: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Clipboard Base */}
    <rect x="14" y="14" width="34" height="38" rx="7" fill="#3B82F6" />
    {/* Top Clip */}
    <rect x="24" y="9" width="14" height="8" rx="3" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="1.5" />
    {/* Checklist rows */}
    <rect x="22" y="24" width="5" height="5" rx="1.5" fill="#10B981" />
    <path d="M23.5 26.5L25 28L29 23.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    <rect x="30" y="25" width="12" height="3" rx="1.5" fill="#DBEAFE" />

    <rect x="22" y="33" width="5" height="5" rx="1.5" fill="#10B981" />
    <path d="M23.5 35.5L25 37L29 32.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    <rect x="30" y="34" width="10" height="3" rx="1.5" fill="#DBEAFE" />

    {/* Gear Badge */}
    <g transform="translate(37, 36)">
      <circle cx="10" cy="10" r="9" fill="#F97316" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="10" cy="10" r="3.5" fill="#FFFFFF" />
    </g>
  </svg>
);

// 9. Rising Growth Chart (Analytics & Performance)
const IconAnalyticsChart: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Bars */}
    <rect x="15" y="36" width="8" height="15" rx="3" fill="#3B82F6" />
    <rect x="28" y="28" width="8" height="23" rx="3" fill="#F97316" />
    <rect x="41" y="19" width="8" height="32" rx="3" fill="#EF4444" />
    {/* Curving Growth Arrow */}
    <path d="M16 32C24 24 36 20 48 11" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
    <path d="M41 10H49V18" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 10. Security Shield (Security & Compliance)
const IconSecurityShield: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Shield */}
    <path
      d="M32 10L48 16V30C48 40.5 41 49 32 54C23 49 16 40.5 16 30V16L32 10Z"
      fill="#10B981"
      stroke="#34D399"
      strokeWidth="2"
    />
    {/* Center Lock */}
    <rect x="25" y="29" width="14" height="12" rx="3" fill="#FFFFFF" />
    <path d="M28 29V24C28 21.8 29.8 20 32 20C34.2 20 36 21.8 36 24V29" stroke="#FFFFFF" strokeWidth="3" fill="none" />
    <circle cx="32" cy="34" r="1.5" fill="#10B981" />
    <path d="M32 35.5V38" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 11. Org Hierarchy Chart (Departments & Roles)
const IconOrgHierarchy: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Top Node (Orange) */}
    <rect x="25" y="12" width="14" height="10" rx="3" fill="#F97316" />
    {/* Connecting Tree Lines */}
    <path d="M32 22V32M17 32H47M17 32V38M32 32V38M47 32V38" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Bottom 3 Nodes (Blue/Teal) */}
    <rect x="11" y="38" width="12" height="9" rx="2.5" fill="#06B6D4" />
    <rect x="26" y="38" width="12" height="9" rx="2.5" fill="#3B82F6" />
    <rect x="41" y="38" width="12" height="9" rx="2.5" fill="#0D9488" />
  </svg>
);

// --- The 11 Icons Configured with Precise Positions & Glow Effects ---
const hrmsIcons: FloatingIconItem[] = [
  // 1. Calendar (Attendance) - Top-Left center
  {
    id: 1,
    name: 'Attendance & Scheduling',
    icon: IconCalendarClock,
    className: 'top-[8%] sm:top-[11%] left-[24%] sm:left-[28%]',
    glowColor: 'radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0) 70%)',
  },
  // 2. Beach Umbrella (Leaves) - Top-Right center
  {
    id: 2,
    name: 'Leave & Vacation',
    icon: IconLeavesBeach,
    className: 'top-[7%] sm:top-[9%] right-[32%] sm:right-[38%]',
    glowColor: 'radial-gradient(circle, rgba(249,115,22,0.45) 0%, rgba(249,115,22,0) 70%)',
  },
  // 3. Laptop Asset - Far Upper-Left
  {
    id: 3,
    name: 'IT Hardware & Assets',
    icon: IconLaptopAsset,
    className: 'top-[16%] sm:top-[17%] left-[6%] sm:left-[8%]',
    glowColor: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0) 70%)',
  },
  // 4. Laptop Gear - Far Mid-Left
  {
    id: 4,
    name: 'IT Support & Systems',
    icon: IconLaptopGear,
    className: 'top-[47%] sm:top-[48%] left-[3%] sm:left-[5%]',
    glowColor: 'radial-gradient(circle, rgba(6,182,212,0.45) 0%, rgba(6,182,212,0) 70%)',
  },
  // 5. Org Hierarchy - Bottom-Left
  {
    id: 5,
    name: 'Departments & Hierarchy',
    icon: IconOrgHierarchy,
    className: 'bottom-[9%] sm:bottom-[11%] left-[16%] sm:left-[20%]',
    glowColor: 'radial-gradient(circle, rgba(251,146,60,0.45) 0%, rgba(251,146,60,0) 70%)',
  },
  // 6. Security Shield - Bottom-Center
  {
    id: 6,
    name: 'Enterprise Security',
    icon: IconSecurityShield,
    className: 'bottom-[4%] sm:bottom-[6%] left-[44%] sm:left-[47%]',
    glowColor: 'radial-gradient(circle, rgba(34,197,94,0.45) 0%, rgba(34,197,94,0) 70%)',
  },
  // 7. Analytics Chart - Bottom-Right
  {
    id: 7,
    name: 'Performance & Reports',
    icon: IconAnalyticsChart,
    className: 'bottom-[7%] sm:bottom-[9%] right-[18%] sm:right-[22%]',
    glowColor: 'radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0) 70%)',
  },
  // 8. Tasks Checklist - Lower Mid-Right
  {
    id: 8,
    name: 'Projects & Workflows',
    icon: IconTasksChecklist,
    className: 'top-[62%] sm:top-[63%] right-[8%] sm:right-[12%]',
    glowColor: 'radial-gradient(circle, rgba(129,140,248,0.45) 0%, rgba(129,140,248,0) 70%)',
  },
  // 9. Payroll Wallet - Mid Right
  {
    id: 9,
    name: 'Payroll & Compensation',
    icon: IconPayrollWallet,
    className: 'top-[43%] sm:top-[44%] right-[4%] sm:right-[6%]',
    glowColor: 'radial-gradient(circle, rgba(245,158,11,0.45) 0%, rgba(245,158,11,0) 70%)',
  },
  // 10. Bills & Alert Document - Upper Mid-Right
  {
    id: 10,
    name: 'Bills & WhatsApp Alerts',
    icon: IconBillsReminder,
    className: 'top-[22%] sm:top-[23%] right-[17%] sm:right-[21%]',
    glowColor: 'radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(168,85,247,0) 70%)',
  },
  // 11. Employee Team - Far Upper-Right
  {
    id: 11,
    name: 'Employee Directory',
    icon: IconEmployeeTeam,
    className: 'top-[15%] sm:top-[16%] right-[5%] sm:right-[7%]',
    glowColor: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, rgba(236,72,153,0) 70%)',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, isAdmin, isITSupport } = useAuth();
  const [isVanishing, setIsVanishing] = React.useState(false);

  const homePath = isITSupport ? '/assets' : isAdmin ? '/admin' : user?.id ? `/profile/${user.id}` : '/assets';
  const [countdown, setCountdown] = React.useState(5);

  React.useEffect(() => {
    // Only if already logged in, wait 5 seconds and automatically vanish into workspace
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const timer = setTimeout(() => {
      setIsVanishing(true);
      setTimeout(() => {
        navigate(homePath, { replace: true });
      }, 550);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isAuthenticated, homePath, navigate]);

  const handleAction = React.useCallback(() => {
    if (!isAuthenticated) {
      // If not logged in, go straight to login without any vanish animation or overlay
      navigate('/login');
      return;
    }

    // If already logged in, vanish smoothly and transition into their portal immediately
    if (isVanishing) return;
    setIsVanishing(true);
    setTimeout(() => {
      navigate(homePath, { replace: true });
    }, 550);
  }, [isAuthenticated, isVanishing, navigate, homePath]);

  const buttonText = isAuthenticated ? `Enter Workspace (${countdown}s)` : 'Sign In';

  return (
    <AnimatePresence mode="wait">
      {!isVanishing ? (
        <motion.div
          key="landing-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)', transition: { duration: 0.5, ease: 'easeInOut' } }}
          className="relative w-full min-h-screen bg-white dark:bg-surface-950 overflow-hidden font-sans"
        >
          {/* Top Navigation Bar with Quick Portal Link */}
          <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
                C
              </div>
              <span className="font-bold text-lg text-secondary-900 dark:text-white tracking-tight">
                CTI HRMS
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAction}
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full border border-slate-200 dark:border-surface-800 text-secondary-700 dark:text-surface-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-primary-500" />
                {buttonText}
              </button>
            </div>
          </header>

          {/* Main Floating Icons Hero Section */}
          <FloatingIconsHero
            title="HRMS"
            subtitle="Simplify your people operations with an all-in-one HRMS platform, empowering your team, streamlining processes and building a better workplace."
            ctaText={buttonText}
            onCtaClick={handleAction}
            icons={hrmsIcons}
          />
        </motion.div>
      ) : (
        <motion.div
          key="landing-vanish-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-surface-950 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/30 animate-pulse">
              C
            </div>
            <p className="text-sm font-semibold text-secondary-700 dark:text-surface-200 animate-pulse">
              Entering HRMS...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
