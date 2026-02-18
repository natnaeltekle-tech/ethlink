import { Handshake } from "lucide-react";

export default function Loading() {
  return (
    <div 
      className="h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-full animate-pulse">
          <Handshake className="h-12 w-12 text-primary" />
        </div>
        <span className="text-muted-foreground text-sm animate-pulse">
          Loading...
        </span>
      </div>
    </div>
  )
}