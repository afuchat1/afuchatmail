import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushSubscription,
} from "@/lib/pushNotifications";

interface PushNotificationToggleProps {
  emailAddressId: string;
}

export const PushNotificationToggle = ({ emailAddressId }: PushNotificationToggleProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    checkSupport();
    checkSubscription();
  }, [emailAddressId]);

  const checkSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
  };

  const checkSubscription = async () => {
    try {
      const subscribed = await checkPushSubscription(emailAddressId);
      setIsEnabled(subscribed);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!isSupported) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    setIsLoading(true);
    try {
      if (checked) {
        await subscribeToPushNotifications(emailAddressId);
        toast.success("Push notifications enabled");
      } else {
        await unsubscribeFromPushNotifications();
        toast.success("Push notifications disabled");
      }
      setIsEnabled(checked);
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      toast.error(
        checked
          ? "Failed to enable push notifications"
          : "Failed to disable push notifications"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground">
        Push notifications are not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="push-notifications"
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      <Label htmlFor="push-notifications">
        Enable push notifications for new emails
      </Label>
    </div>
  );
};
