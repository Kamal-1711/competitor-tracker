"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { addCompetitor } from "../competitors/actions";
import { AddCompetitorDialog } from "../competitors/add-competitor-dialog";

export function DashboardHeader({ onScanAll }: { onScanAll: () => Promise<any> }) {
    const [isScanning, setIsScanning] = useState(false);

    const handleScanAll = async () => {
        setIsScanning(true);
        try {
            await onScanAll();
        } catch (error) {
            console.error(error);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex items-center justify-between border-b border-border/40 pb-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Monitor your competitive landscape at a glance
                </p>
            </div>
            <div className="flex items-center gap-4">
                <AddCompetitorDialog addCompetitor={addCompetitor} />
                <Button
                    onClick={handleScanAll}
                    disabled={isScanning}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        "Scan All"
                    )}
                </Button>
            </div>
        </div>
    );
}
