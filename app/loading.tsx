import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-primary/20"></div>
          <Loader2 className="h-20 w-20 text-primary animate-spin absolute top-0 left-0" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-primary">EthLink</h2>
          <p className="text-sm text-muted-foreground">Loading your marketplace...</p>
        </div>
      </div>
    </div>
  )
}