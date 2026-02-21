export default function SettingsPage() {
  console.log("!!! SETTINGS PAGE SERVER RENDER TRIGGERED !!!");
  return (
    <div className="p-12 space-y-6">
      <div className="bg-red-600 text-white p-8 text-center font-bold text-4xl rounded-2xl shadow-2xl animate-pulse">
        DEBUG: I AM THE SETTINGS PAGE
      </div>
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Route Verification</h2>
        <p className="text-muted-foreground">If you see this, the routing for <code>/dashboard/settings</code> is working correctly.</p>
        <p className="mt-4 p-4 bg-muted rounded font-mono break-all font-bold text-lg">
          TIMESTAMP: {new Date().toISOString()}
        </p>
      </div>
    </div>
  );
}
