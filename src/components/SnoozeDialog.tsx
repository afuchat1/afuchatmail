import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addHours, addDays, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SnoozeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailId: string;
  onSnooze: () => void;
}

export const SnoozeDialog = ({ open, onOpenChange, emailId, onSnooze }: SnoozeDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const quickSnoozeOptions = [
    { label: "Later today", date: setMinutes(setHours(new Date(), 18), 0) },
    { label: "Tomorrow", date: setMinutes(setHours(addDays(new Date(), 1), 9), 0) },
    { label: "This weekend", date: setMinutes(setHours(addDays(new Date(), (6 - new Date().getDay())), 9), 0) },
    { label: "Next week", date: setMinutes(setHours(addDays(new Date(), 7), 9), 0) },
  ];

  const handleSnooze = async (snoozeDate: Date) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("emails")
        .update({ snoozed_until: snoozeDate.toISOString() })
        .eq("id", emailId);

      if (error) throw error;

      toast({
        title: "Email snoozed",
        description: `Will reappear on ${format(snoozeDate, "PPP 'at' p")}`,
      });

      onSnooze();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error snoozing email",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Snooze email</DialogTitle>
          <DialogDescription>
            Choose when you want this email to reappear in your inbox
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {quickSnoozeOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                onClick={() => handleSnooze(option.date)}
                disabled={isLoading}
                className="justify-start"
              >
                <Clock className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(option.date, "EEE, p")}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Pick a date & time</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP 'at' p") : "Pick a date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedDate && (
            <Button onClick={() => handleSnooze(selectedDate)} disabled={isLoading}>
              Snooze
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};