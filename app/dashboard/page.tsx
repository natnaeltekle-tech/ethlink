import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, Handshake } from "lucide-react";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Simple Header */}
            <header className="bg-white dark:bg-gray-950 border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
                        <Handshake className="h-6 w-6" />
                        EthLink
                    </Link>
                    <Link href="/">
                        <Button variant="ghost">Back to Home</Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <h1 className="text-3xl font-bold mb-8">My Profile</h1>

                <div className="grid gap-6">
                    {/* User Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                User Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Email</p>
                                    <p className="text-lg font-medium">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Role</p>
                                    <p className="text-lg font-medium">User</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* My Activity Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>My Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed">
                                <p>You haven't requested any services yet.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Log Out Button */}
                    <div className="flex justify-end">
                        <form action="/auth/signout" method="post">
                            <Button variant="destructive" size="lg">
                                Log Out
                            </Button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
