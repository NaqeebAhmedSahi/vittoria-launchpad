import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const SignIn = ({ onSignIn }: { onSignIn: (token: string, user: any) => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await window.api.auth.login(username, password);
      
      if (result.success && result.sessionToken && result.user) {
        // Store token and user in localStorage
        localStorage.setItem("authToken", result.sessionToken);
        localStorage.setItem("authUser", JSON.stringify(result.user));
        
        // Call parent callback to update app state
        onSignIn(result.sessionToken, result.user);
      } else {
        setError(result.error || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
             <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Vittoria Logo"
            >
              <rect
                x="4"
                y="4"
                width="56"
                height="56"
                rx="16"
                fill="#0F172A"
              />
              <defs>
                <linearGradient id="vittoria-gradient" x1="12" y1="16" x2="52" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#22C55E" />
                </linearGradient>
              </defs>
              <path
                d="M14 24 L28 46 L50 18"
                fill="none"
                stroke="url(#vittoria-gradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="32"
                cy="32"
                r="20"
                fill="none"
                stroke="rgba(148, 163, 184, 0.35)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl text-center">BWS Vittoria</CardTitle>
          <CardDescription className="text-center">
            Sign in to access your recruitment platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-xs text-center text-muted-foreground mt-4">
              Default credentials: <span className="font-mono">admin / admin123</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
