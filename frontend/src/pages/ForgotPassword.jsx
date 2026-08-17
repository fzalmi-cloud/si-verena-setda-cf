import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSent(true);
      toast.success("Link reset password telah dikirim ke email Anda");
      setLoading(false);
    }, 1500);
  };

  if (sent) {
    return (
      <AuthLayout
        icon={CheckCircle}
        title="Email Terkirim"
        subtitle="Periksa inbox email Anda"
      >
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Kami telah mengirimkan link reset password ke <strong>{email}</strong>. 
            Silakan periksa inbox atau folder spam Anda.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Mail}
      title="Lupa Password?"
      subtitle="Masukkan email untuk reset password"
      footer={
        <Link to="/login" className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Mengirim...
            </>
          ) : (
            "Kirim Link Reset"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
