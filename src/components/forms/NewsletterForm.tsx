import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NewsletterFormProps {
  onSubmit?: (email: string) => void;
  className?: string;
}

export const NewsletterForm: React.FC<NewsletterFormProps> = ({ onSubmit, className = "" }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Veuillez entrer une adresse email");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Veuillez entrer une adresse email valide");
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement actual newsletter subscription API call
      if (onSubmit) {
        await onSubmit(email);
      }
      toast.success("Inscription réussie!");
      setEmail("");
    } catch (err) {
      console.error("Newsletter subscription error:", err);
      setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-2">
        <Input
          id="newsletter-email"
          name="newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-olive-800 border-olive-700 focus:border-olive-500 text-white placeholder:text-olive-400"
          disabled={loading}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        <Button
          type="submit"
          className="w-full bg-beige-400 hover:bg-beige-500 text-olive-900"
          disabled={loading}
        >
          {loading ? "En cours..." : "S'abonner"}
        </Button>
      </div>
    </form>
  );
};
