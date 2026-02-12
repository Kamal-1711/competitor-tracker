"use client";
import { useState } from "react";
import { recoverSharedCompetitors } from "../competitors/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, RefreshCw, CheckCircle2 } from "lucide-react";

export default function RecoverPage() {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    const handleRecover = async () => {
        setStatus("loading");
        try {
            const result = await recoverSharedCompetitors();
            if (result.ok) {
                setStatus("success");
            } else {
                setStatus("error");
                setError(result.error || "Unknown error occurred");
            }
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Failed to trigger recovery");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full border-orange-200 bg-orange-50/5 dark:bg-orange-950/10 dark:border-orange-900/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <ShieldAlert className="h-5 w-5" />
                        Data Recovery Utility
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        This utility will move competitors and insights from the <strong>Shared/Anonymous Workspace</strong> into your <strong>Private Workspace</strong>.
                    </p>

                    {status === "idle" && (
                        <Button onClick={handleRecover} className="w-full gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Recover My Competitors
                        </Button>
                    )}

                    {status === "loading" && (
                        <Button disabled className="w-full gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Recovering...
                        </Button>
                    )}

                    {status === "success" && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center space-y-3">
                            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                            <div className="space-y-1">
                                <p className="font-bold text-green-700 dark:text-green-400">Recovery Successful!</p>
                                <p className="text-xs text-green-600/80 dark:text-green-500/80">Your competitors have been moved. You can now return to the dashboard.</p>
                            </div>
                            <Button asChild variant="outline" className="w-full">
                                <a href="/dashboard">Back to Dashboard</a>
                            </Button>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
                            <p className="font-bold text-red-700 dark:text-red-400 text-sm">Recovery Failed</p>
                            <p className="text-xs text-red-600/80 dark:text-red-500/80">{error}</p>
                            <Button onClick={() => setStatus("idle")} variant="ghost" size="sm" className="w-full">Try Again</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
