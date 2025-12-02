import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: note } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .single();

    if (!note) {
        notFound();
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <CardTitle>{note.title || "Untitled Note"}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                        {note.content ? (
                            <p className="whitespace-pre-wrap">{note.content}</p>
                        ) : (
                            <p className="text-muted-foreground italic">No content.</p>
                        )}
                    </div>
                    <div className="mt-8 text-xs text-muted-foreground">
                        Note ID: {note.id}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
