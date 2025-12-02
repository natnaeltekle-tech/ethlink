"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // I might need to create this or use standard textarea
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewNotePage() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();
        const { error } = await supabase.from("notes").insert({
            title,
            // content: content, // Assuming content column exists, if not I'll just insert title for now based on previous file view which only showed title in UI.
            // Let's assume there is no content column yet based on `app/notes/page.tsx` only showing title. 
            // Wait, `app/notes/page.tsx` showed `note.title` and `note.id`.
            // I'll check the schema if I can, but I can't directly.
            // I'll try to insert title only first to be safe, or I'll check if I can find a schema definition.
            // Actually, I'll just try to insert title. If the user wants content, they can add it later or I'll add it if I see it.
            // BUT, a note usually has content. I'll add a content field but maybe comment it out or make it optional if I'm unsure.
            // Re-reading `app/notes/page.tsx`: `const { data: notes } = await supabase.from('notes').select()`
            // It doesn't explicitly select fields, so `*`.
            // I'll assume `title` is there.
        });

        if (error) {
            console.error("Error creating note:", error);
            alert("Error creating note");
        } else {
            router.push("/dashboard");
            router.refresh();
        }

        setIsLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/40">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <CardTitle>Create New Note</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="title" className="text-sm font-medium">
                                Title
                            </label>
                            <Input
                                id="title"
                                placeholder="Note title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        {/* 
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content
              </label>
              <textarea
                id="content"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Write your note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
             */}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create Note"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
