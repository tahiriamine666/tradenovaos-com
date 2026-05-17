import React from "react";
import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingCancel() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <XCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-heading text-foreground">Checkout cancelled</h1>
          <p className="text-sm text-muted-foreground">
            No charge was made. You can pick a plan whenever you're ready.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="rounded-xl">
            <Link to="/pricing">Back to pricing</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link to="/app">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
