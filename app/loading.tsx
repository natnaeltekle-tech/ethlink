import { Handshake, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background space-y-6">
      <div className="flex flex-col items-center gap-2">
        <div className="bg-primary/10 p-6 rounded-full">
          <Handshake className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">EthLink</h1>
      </div>

      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  )
}