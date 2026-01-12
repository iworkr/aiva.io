"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Inbox, 
  Brain, 
  MessageSquare, 
  Calendar, 
  ListTodo,
  Check,
  Users,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { CHANNEL_LOGOS } from "@/constants/channel-logos";

// Tab configurations
const tabs = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "priorities", label: "AI Priorities", icon: Brain },
  { id: "drafts", label: "Drafts", icon: MessageSquare },
  { id: "scheduling", label: "Scheduling", icon: Calendar },
  { id: "tasks", label: "Tasks", icon: ListTodo },
];

// Sample inbox data
const inboxMessages = [
  { from: "Sarah Chen", channel: "gmail", status: "New", assignee: "You", subject: "Q4 Budget Review" },
  { from: "Mike Johnson", channel: "slack", status: "Replied", assignee: "Alex", subject: "Project update" },
  { from: "Acme Corp", channel: "gmail", status: "Scheduled", assignee: "You", subject: "Contract discussion" },
  { from: "Team Channel", channel: "teams", status: "FYI", assignee: "All", subject: "Weekly notes" },
];

// Priority data
const priorities = [
  { label: "Urgent", color: "bg-red-500", count: 2, description: "High-stakes decisions or time-sensitive" },
  { label: "Needs Reply", color: "bg-amber-500", count: 5, description: "Awaiting your response" },
  { label: "Scheduling", color: "bg-blue-500", count: 3, description: "Meeting or calendar requests" },
  { label: "Task", color: "bg-purple-500", count: 4, description: "Action items extracted" },
  { label: "FYI", color: "bg-slate-400", count: 8, description: "Informational, no action needed" },
];

// Draft options
const draftVariants = [
  { tone: "Friendly", preview: "Hi Sarah! Thanks for sending this over. I've reviewed everything and it looks great..." },
  { tone: "Professional", preview: "Dear Sarah, Thank you for the budget review. I have completed my analysis and approve..." },
  { tone: "Brief", preview: "Sarah - Reviewed and approved. Let me know if you need anything else." },
];

// Scheduling flow
const schedulingSteps = [
  { step: "Intent Detected", detail: '"Can we meet this week?" from Mike Johnson' },
  { step: "Times Proposed", detail: "Tue 2pm, Wed 10am, Thu 3pm" },
  { step: "Confirmed", detail: "Meeting scheduled for Wed 10am" },
];

// Tasks
const extractedTasks = [
  { task: "Review Q4 budget proposal", due: "Today", source: "Sarah Chen", done: true },
  { task: "Schedule call with Mike", due: "This week", source: "Mike Johnson", done: false },
  { task: "Send contract to Acme Corp", due: "Tomorrow", source: "Acme Corp", done: false },
  { task: "Update project timeline", due: "Friday", source: "Team Channel", done: false },
];

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("inbox");

  return (
    <section className="py-20 lg:py-28 px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            See Aiva in action.
          </h2>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-2 h-auto bg-transparent p-0 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab content container */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-lg">
            {/* Inbox Tab */}
            <TabsContent value="inbox" className="m-0">
              <div className="p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Unified Inbox</h3>
                    <p className="text-sm text-muted-foreground">One inbox for every channel — with team clarity.</p>
                  </div>
                  <Badge variant="outline">4 messages</Badge>
                </div>
                
                <div className="space-y-2">
                  {inboxMessages.map((msg, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <Image
                        src={CHANNEL_LOGOS[msg.channel as keyof typeof CHANNEL_LOGOS]}
                        alt={msg.channel}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{msg.from}</p>
                        <p className="text-sm text-muted-foreground truncate">{msg.subject}</p>
                      </div>
                      <Badge variant="secondary" className="hidden sm:flex gap-1">
                        <Users className="w-3 h-3" />
                        {msg.assignee}
                      </Badge>
                      <Badge variant="outline">{msg.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Priorities Tab */}
            <TabsContent value="priorities" className="m-0">
              <div className="p-6 lg:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">AI Priority Engine</h3>
                  <p className="text-sm text-muted-foreground">Priority scoring you can trust — with explanations.</p>
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {priorities.map((priority, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-background"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", priority.color)} />
                          <span className="font-medium">{priority.label}</span>
                        </div>
                        <Badge variant="secondary">{priority.count}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{priority.description}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm">
                    <span className="font-medium">Why this is urgent:</span>{" "}
                    <span className="text-muted-foreground">
                      Contains deadline language ("need approval today"), from VIP contact, high priority keywords detected.
                    </span>
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Drafts Tab */}
            <TabsContent value="drafts" className="m-0">
              <div className="p-6 lg:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Smart Drafts</h3>
                  <p className="text-sm text-muted-foreground">Drafts in your voice. Pick, edit, approve.</p>
                </div>
                
                <div className="space-y-3">
                  {draftVariants.map((draft, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        index === 0 ? "border-primary bg-primary/5" : "bg-background hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={index === 0 ? "default" : "outline"}>{draft.tone}</Badge>
                        {index === 0 && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{draft.preview}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Tone</p>
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-full w-1/3 bg-primary rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Friendly</span>
                      <span>Direct</span>
                    </div>
                  </div>
                  <Button size="sm">Approve & Send</Button>
                </div>
              </div>
            </TabsContent>

            {/* Scheduling Tab */}
            <TabsContent value="scheduling" className="m-0">
              <div className="p-6 lg:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Scheduling Agent</h3>
                  <p className="text-sm text-muted-foreground">Aiva handles the thread. Your calendar stays accurate.</p>
                </div>
                
                <div className="space-y-4">
                  {schedulingSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        index === schedulingSteps.length - 1 ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
                      )}>
                        {index === schedulingSteps.length - 1 ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium">{step.step}</p>
                        <p className="text-sm text-muted-foreground">{step.detail}</p>
                      </div>
                      {index < schedulingSteps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-2" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">Meeting Confirmed</p>
                      <p className="text-sm text-green-600 dark:text-green-500">Wed, Jan 15 at 10:00 AM with Mike Johnson</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="m-0">
              <div className="p-6 lg:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Task Extraction</h3>
                  <p className="text-sm text-muted-foreground">Every request becomes a trackable next step.</p>
                </div>
                
                <div className="space-y-2">
                  {extractedTasks.map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-background"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                        task.done ? "bg-primary border-primary" : "border-muted-foreground/30"
                      )}>
                        {task.done && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium", task.done && "line-through text-muted-foreground")}>
                          {task.task}
                        </p>
                        <p className="text-xs text-muted-foreground">From: {task.source}</p>
                      </div>
                      <Badge variant={task.due === "Today" ? "destructive" : "secondary"}>
                        {task.due}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">1</span> of <span className="font-medium text-foreground">4</span> tasks completed
                  </p>
                  <Button variant="outline" size="sm">View All Tasks</Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
