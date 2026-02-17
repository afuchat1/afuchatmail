import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

const Contact = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setName(""); setEmail(""); setSubject(""); setMessage("");
      setLoading(false);
    }, 1000);
  };

  const contacts = [
    { label: "General", email: "contact@afuchat.com" },
    { label: "Support", email: "support@afuchat.com" },
    { label: "Business", email: "business@afuchat.com" },
  ];

  return (
    <PageLayout>
      <section className="pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Contact</h1>
        <p className="text-muted-foreground">We'd love to hear from you.</p>
      </section>

      <section className="pb-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Email us</h2>
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">{c.label}</span>
              <span className="text-sm text-primary">{c.email}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Response within 24 hours · 24/7 online support</p>
      </section>

      <div className="border-t" />

      <section className="py-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-6">Send a message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Name</Label>
              <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required className="border-0 bg-muted rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-0 bg-muted rounded-lg" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Subject</Label>
            <Input placeholder="What's this about?" value={subject} onChange={(e) => setSubject(e.target.value)} required className="border-0 bg-muted rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Message</Label>
            <Textarea placeholder="Tell us more..." value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required className="border-0 bg-muted rounded-lg resize-none" />
          </div>
          <Button type="submit" className="w-full h-12 rounded-lg" disabled={loading}>
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </section>
    </PageLayout>
  );
};

export default Contact;
