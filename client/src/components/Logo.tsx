import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-summit-primary"
        >
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M8 12L24 12L16 24Z" fill="currentColor" />
        </svg>
      </div>
      <div className="text-white">
        <div className="text-2xl font-bold tracking-wider">THE SUMMIT</div>
        <div className="text-lg font-bold text-summit-accent">25</div>
      </div>
    </div>
  );
}
