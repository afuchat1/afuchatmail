import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, HelpCircle, Mail, Clock, MapPin, Phone } from "lucide-react";

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
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setLoading(false);
    }, 1000);
  };

  const contactMethods = [
    {
      icon: MessageSquare,
      title: "General Inquiries",
      description: "Questions about our service",
      detail: "contact@afuchat.com"
    },
    {
      icon: HelpCircle,
      title: "Technical Support",
      description: "Need help with your account",
      detail: "support@afuchat.com"
    },
    {
      icon: Mail,
      title: "Business",
      description: "Partnership opportunities",
      detail: "business@afuchat.com"
    }
  ];

  const info = [
    { icon: Clock, label: "Response Time", value: "Within 24 hours" },
    { icon: MapPin, label: "Location", value: "Global Service" },
    { icon: Phone, label: "Support Hours", value: "24/7 Online" }
  ];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 pt-16 pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">Contact</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Get in Touch</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions? We'd love to hear from you
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {contactMethods.map((method, index) => (
            <Card key={index} className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                  <method.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{method.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                <p className="text-sm font-medium text-primary">{method.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Bar */}
        <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-12 p-4 rounded-xl bg-muted/50 border">
          {info.map((item, index) => (
            <div key={index} className="flex items-center gap-3 justify-center">
              <item.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <Card className="max-w-2xl mx-auto border-2">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you shortly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="What's this about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full h-12" disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </PageLayout>
  );
};

export default Contact;