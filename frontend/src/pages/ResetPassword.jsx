import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "sonner";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSuccess(true);
      toast.success("Password berhasil direset!");
      setLoading(false);
    }, 1500);
  };

  if (success) {
    return (
      <AuthLayout
        icon={CheckCircle}
        title="Password Berhasil Direset!"
        subtitle="Silakan login dengan password baru"
      >
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Password Anda telah berhasil diubah. Silakan login dengan password baru.
          </p>
          <Link to="/login">
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Login Sekarang
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (!token) {
    return (
      <AuthLayout
        icon={Lock}
        title="Link Tidak Valid"
        subtitle="Reset password gagal"
      >
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Link reset password tidak valid atau sudah kedaluwarsa.
          </p>
          <Link to="/forgot-password">
            <Button variant="outline" className="w-full">
              Minta Link Baru
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Reset Password"
      subtitle="Masukkan password baru Anda"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password Baru</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
              minLength={6}
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimal 6 karakter</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Konfirmasi Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Mereset password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
