import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail, Clock, MessageSquare, HelpCircle } from "lucide-react";

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
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
      setName(""); setEmail(""); setSubject(""); setMessage("");
      setLoading(false);
    }, 1000);
  };

  const contacts = [
    { icon: Mail, label: "General Inquiries", email: "contact@afuchat.com", desc: "Questions about AfuChat Mail" },
    { icon: HelpCircle, label: "Technical Support", email: "support@afuchat.com", desc: "Help with your account or features" },
    { icon: MessageSquare, label: "Business & Partnerships", email: "business@afuchat.com", desc: "Collaboration and integration inquiries" },
  ];

  const faqs = [
    { q: "How do I reset my password?", a: "Go to the sign-in page and click 'Forgot Password'. We'll send a reset link to your registered email." },
    { q: "How do I create an alias?", a: "Go to Settings → Addresses and use the alias creation form. Aliases forward to your main inbox." },
    { q: "Can I change my email address?", a: "You can create a new @afuchat.com address anytime. You can also set any address as your primary." },
    { q: "How do I enable push notifications?", a: "Go to Settings → Preferences → Notifications and enable push notifications for your device." },
    { q: "Is there a file size limit for attachments?", a: "Individual attachments are limited to 10MB. You can attach multiple files per email." },
  ];

  return (
    <PageLayout title="Contact">
      <section className="pb-8">
        <h1 className="text-3xl font-black tracking-tight mb-3">Contact Us</h1>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
          Have a question, suggestion, or need help? We're here for you.
        </p>
      </section>

      {/* Contact Channels */}
      <section className="pb-8">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Reach Out</p>
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <c.icon className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{c.label}</h3>
                <p className="text-primary text-sm font-semibold">{c.email}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-semibold">Average response time: under 24 hours · Support available 7 days a week</span>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Contact Form */}
      <section className="py-8">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Send a Message</p>
        <h2 className="text-xl font-black mb-5">Get in touch directly</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</Label>
              <Input placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required className="border border-border bg-card rounded-xl shadow-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="border border-border bg-card rounded-xl shadow-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</Label>
            <Input placeholder="What can we help with?" value={subject} onChange={(e) => setSubject(e.target.value)} required className="border border-border bg-card rounded-xl shadow-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Message</Label>
            <Textarea placeholder="Describe your question or issue in detail..." value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required className="border border-border bg-card rounded-xl shadow-xs resize-none" />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-md" disabled={loading}>
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </section>

      <div className="border-t border-border" />

      {/* FAQ */}
      <section className="py-8">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">FAQ</p>
        <h2 className="text-xl font-black mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <h3 className="font-bold text-sm mb-1.5">{faq.q}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pb-16" />
    </PageLayout>
  );
};

export default Contact;