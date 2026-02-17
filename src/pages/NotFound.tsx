import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <Mail className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-black text-primary mb-3">404</h1>
        <h2 className="text-xl font-bold mb-2">Page not found</h2>
        <p className="text-muted-foreground text-sm font-medium mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button className="rounded-xl font-bold shadow-sm" onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;