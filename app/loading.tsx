import { Handshake } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="bg-primary/10 p-4 rounded-full animate-pulse">
        <Handshake className="h-12 w-12 text-primary" />
      </div>
    </div>
  )
}