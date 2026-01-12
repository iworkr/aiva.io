"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  MessageSquare, 
  Calendar, 
  Shield,
  Clock,
  Users,
  AlertTriangle,
} from "lucide-react";

export default function DeepDive() {
  const [confidenceThreshold, setConfidenceThreshold] = useState([85]);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  
  // Approval rules
  const [approvalRules, setApprovalRules] = useState({
    refunds: true,
    legal: true,
    pricing: true,
    vips: false,
  });

  // Scheduling settings
  const [workingHours, setWorkingHours] = useState({ start: "9:00 AM", end: "5:00 PM" });
  const [bufferTime, setBufferTime] = useState(15);

  const getConfidenceLabel = (value: number) => {
    if (value >= 90) return { text: "More automation", color: "text-green-600" };
    if (value >= 80) return { text: "Balanced", color: "text-amber-600" };
    return { text: "More review", color: "text-red-600" };
  };

  const confidenceLabel = getConfidenceLabel(confidenceThreshold[0]);

  return (
    <section className="py-20 lg:py-28 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Let Aiva handle routine replies — and the endless scheduling loop.
          </h2>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Auto-reply */}
          <div className="p-6 lg:p-8 rounded-2xl border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Auto-reply</h3>
                <p className="text-sm text-muted-foreground">Auto-send only when you're comfortable.</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Confidence threshold slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence threshold</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", confidenceLabel.color)}>
                      {confidenceThreshold[0]}%
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {confidenceLabel.text}
                    </Badge>
                  </div>
                </div>
                <Slider
                  value={confidenceThreshold}
                  onValueChange={setConfidenceThreshold}
                  min={50}
                  max={95}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50% (More review)</span>
                  <span>95% (More automation)</span>
                </div>
              </div>

              {/* Example */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Example:</p>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>92% confident</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-600">Auto-send</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>68% confident</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-amber-600">Draft for review</span>
                </div>
              </div>

              {/* Approval toggles */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Always require approval for:</p>
                {Object.entries(approvalRules).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm capitalize">{key}</span>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) =>
                        setApprovalRules((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Scheduling */}
          <div className="p-6 lg:p-8 rounded-2xl border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Scheduling agent</h3>
                <p className="text-sm text-muted-foreground">Detects booking intent and resolves it end-to-end.</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Working hours */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Working hours</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-background">
                    <p className="text-xs text-muted-foreground mb-1">Start</p>
                    <p className="font-medium">{workingHours.start}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-background">
                    <p className="text-xs text-muted-foreground mb-1">End</p>
                    <p className="font-medium">{workingHours.end}</p>
                  </div>
                </div>
              </div>

              {/* Buffer time */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Buffer between meetings</span>
                  <Badge variant="secondary">{bufferTime} min</Badge>
                </div>
                <div className="flex gap-2">
                  {[0, 15, 30, 45].map((time) => (
                    <button
                      key={time}
                      onClick={() => setBufferTime(time)}
                      className={cn(
                        "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                        bufferTime === time
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      {time}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Meeting types */}
              <div className="space-y-3">
                <span className="text-sm font-medium">Meeting types</span>
                <div className="space-y-2">
                  {["30-min call", "60-min meeting", "15-min quick sync"].map((type) => (
                    <div key={type} className="flex items-center justify-between py-2 px-3 rounded-lg border bg-background">
                      <span className="text-sm">{type}</span>
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Round robin */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Round robin (team)</span>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>You're always in control. Aiva never sends without your rules.</span>
        </div>
      </div>
    </section>
  );
}
