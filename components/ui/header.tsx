import Image from 'next/image';
import SimpleThemeToggle from '@/components/SimpleThemeToggle';

export function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="UltraMaps Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">UltraMaps</h1>
            <p className="text-xs text-muted-foreground">Live Map Systems</p>
          </div>
        </div>
        <SimpleThemeToggle />
      </div>
    </header>
  );
}