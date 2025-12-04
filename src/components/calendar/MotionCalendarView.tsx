/**
 * Motion-Style Calendar View
 * Modern calendar with month/week/day views matching Motion's design
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Search,
  Filter,
  Users,
  FileText,
  Video,
  Eye,
  AlertCircle,
  MoreHorizontal,
  X,
  ChevronDown,
} from 'lucide-react';
import { 
  getEvents, 
  createEventAction, 
  updateEventAction, 
  deleteEventAction,
  getCalendarConnections,
  toggleCalendarVisibilityAction,
  getFrequentContacts,
} from '@/data/user/calendar';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { LazyCreateEventDialog } from '@/components/lazy/LazyDialogs';
import { ManageAccountsDialog } from './ManageAccountsDialog';
import { ManageFrequentContactsDialog } from './ManageFrequentContactsDialog';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
  startOfDay,
  addWeeks,
  subWeeks,
  subMonths,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface MotionCalendarViewProps {
  workspaceId: string;
  userId: string;
}

type ViewMode = 'month' | 'week' | 'day';

export function MotionCalendarView({ workspaceId, userId }: MotionCalendarViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageAccountsDialog, setShowManageAccountsDialog] = useState(false);
  const [showFrequentContactsDialog, setShowFrequentContactsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState<{
    calendars: string[];
    categories: string[];
  }>({ calendars: [], categories: [] });

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      let startTime, endTime;

      switch (viewMode) {
        case 'month':
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(currentDate);
          startTime = startOfWeek(monthStart).toISOString();
          endTime = endOfWeek(monthEnd).toISOString();
          break;
        case 'week':
          startTime = startOfWeek(currentDate).toISOString();
          endTime = endOfWeek(currentDate).toISOString();
          break;
        case 'day':
          startTime = startOfDay(currentDate).toISOString();
          endTime = addDays(startOfDay(currentDate), 1).toISOString();
          break;
      }

      const data = await getEvents(workspaceId, userId, {
        startTime,
        endTime,
      });

      setEvents(data || []);
    } catch (error) {
      toast.error('Failed to load events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [workspaceId, userId, viewMode, currentDate]);

  // Create event
  const { execute: createEvent } = useAction(createEventAction, {
    onSuccess: () => {
      toast.success('Event created successfully');
      setShowCreateDialog(false);
      fetchEvents();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to create event');
    },
  });

  // Update event
  const { execute: updateEvent } = useAction(updateEventAction, {
    onSuccess: () => {
      toast.success('Event updated successfully');
      setShowEventModal(false);
      fetchEvents();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to update event');
    },
  });

  // Delete event
  const { execute: deleteEvent } = useAction(deleteEventAction, {
    onSuccess: () => {
      toast.success('Event deleted successfully');
      setShowEventModal(false);
      fetchEvents();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to delete event');
    },
  });

  // Navigation handlers
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filter events based on search and filters
  const getFilteredEvents = () => {
    return events.filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title?.toLowerCase().includes(query);
        const matchesDescription = event.description?.toLowerCase().includes(query);
        const matchesLocation = event.location?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesLocation) {
          return false;
        }
      }

      // Calendar filter
      if (filters.calendars.length > 0) {
        if (!filters.calendars.includes(event.calendar_connection_id)) {
          return false;
        }
      }

      return true;
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const filteredEvents = getFilteredEvents();
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, date);
    });
  };

  // Get title based on view mode
  const getViewTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-background">
        <LeftSidebar 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate}
          workspaceId={workspaceId}
          userId={userId}
          onManageAccounts={() => setShowManageAccountsDialog(true)}
          onManageFrequentContacts={() => setShowFrequentContactsDialog(true)}
        />
      </div>

      {/* Main Calendar Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToToday}
              >
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="h-8 w-8"
                  aria-label="Go to previous period"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="h-8 w-8"
                  aria-label="Go to next period"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold">{getViewTitle()}</h2>
            </div>

            {/* Right side - View modes and actions */}
            <div className="flex items-center gap-3">
              <Button 
                variant={searchQuery ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSearchDialog(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search
                {searchQuery && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    1
                  </Badge>
                )}
              </Button>
              <Button 
                variant={filters.calendars.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilterDialog(true)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {filters.calendars.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    {filters.calendars.length}
                  </Badge>
                )}
              </Button>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
                <Button
                  variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="h-7 px-3 text-xs"
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="h-7 px-3 text-xs"
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="h-7 px-3 text-xs"
                >
                  Month
                </Button>
              </div>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                aria-label="Create new calendar event"
                className="shadow-md hover:shadow-lg transition-all h-9 px-4 font-medium bg-primary text-primary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Event
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <CalendarIcon className="h-8 w-8 animate-pulse text-muted-foreground" />
              </div>
            ) : getFilteredEvents().length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-md px-6">
                  <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <CalendarIcon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery
                      ? `No events found for "${searchQuery}"`
                      : 'No events scheduled'}
                  </h3>
                  <p className="text-base text-muted-foreground mb-8">
                    {searchQuery
                      ? 'Try a different keyword or clear the search to see all events.'
                      : 'Your calendar is empty. Create your first event to get started, or connect a calendar account to sync existing events.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="shadow-md hover:shadow-lg transition-all h-10 px-5 font-medium bg-primary text-primary-foreground"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Event
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowManageAccountsDialog(true)}
                      className="h-10 px-5 border-2 hover:bg-muted/50 transition-all font-medium"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Connect Calendar
                    </Button>
                  </div>
                </div>
              </div>
            ) : viewMode === 'month' ? (
              <MonthView
                currentDate={currentDate}
                events={getFilteredEvents()}
                getEventsForDate={getEventsForDate}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              />
            ) : viewMode === 'week' ? (
              <WeekView
                currentDate={currentDate}
                events={getFilteredEvents()}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              />
            ) : (
              <DayView
                currentDate={currentDate}
                events={getFilteredEvents()}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 border-l border-border bg-background">
            <RightSidebar 
              currentDate={currentDate} 
              events={events}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
              onResolveOverdue={() => {
                toast.success('Overdue tasks resolved');
                fetchEvents();
              }}
              onRefreshTasks={() => {
                toast.info('Refreshing tasks...');
                fetchEvents();
              }}
            />
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
          <DialogContent className="max-w-md">
            <EventDetailModal 
              event={selectedEvent} 
              workspaceId={workspaceId}
              onClose={() => setShowEventModal(false)} 
              onUpdate={(updates) => {
                updateEvent({
                  id: selectedEvent.id,
                  workspaceId,
                  ...updates,
                });
              }}
              onDelete={() => {
                if (confirm('Are you sure you want to delete this event?')) {
                  deleteEvent({
                    id: selectedEvent.id,
                    workspaceId,
                  });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Create Event Dialog - Lazy Loaded */}
      <LazyCreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        workspaceId={workspaceId}
        onSuccess={fetchEvents}
      />

      {/* Manage Accounts Dialog */}
      <ManageAccountsDialog
        open={showManageAccountsDialog}
        onOpenChange={setShowManageAccountsDialog}
        workspaceId={workspaceId}
        userId={userId}
      />

      {/* Manage Frequent Contacts Dialog */}
      <ManageFrequentContactsDialog
        open={showFrequentContactsDialog}
        onOpenChange={setShowFrequentContactsDialog}
        workspaceId={workspaceId}
        userId={userId}
      />

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search Events</DialogTitle>
            <DialogDescription>
              Find events by title, description, or location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by title, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              aria-label="Search events"
            />
            {searchQuery && (
              <div className="text-sm text-muted-foreground">
                {getFilteredEvents().length === 0 ? (
                  <p>No events found for &quot;{searchQuery}&quot;</p>
                ) : (
                  <p>Found {getFilteredEvents().length} event{getFilteredEvents().length !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDialog(false);
                }}
              >
                Clear
              </Button>
              <Button onClick={() => setShowSearchDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Events</DialogTitle>
            <DialogDescription>
              Filter events by calendar and category. Advanced filtering coming soon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Filter by Calendar</h3>
              <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg border border-border">
                <p className="mb-2">Calendar filtering will be available once you connect calendar accounts.</p>
                <p className="text-xs">Connect your Google Calendar or Outlook calendar to enable filtering by calendar source.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setFilters({ calendars: [], categories: [] });
                  setShowFilterDialog(false);
                }}
              >
                Clear All
              </Button>
              <Button onClick={() => setShowFilterDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Left Sidebar Component
function LeftSidebar({ 
  currentDate, 
  setCurrentDate,
  workspaceId,
  userId,
  onManageAccounts,
  onManageFrequentContacts,
}: { 
  currentDate: Date; 
  setCurrentDate: (date: Date) => void;
  workspaceId: string;
  userId: string;
  onManageAccounts: () => void;
  onManageFrequentContacts: () => void;
}) {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(true);
  const [frequentContacts, setFrequentContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Fetch calendars
  const fetchCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const data = await getCalendarConnections(workspaceId, userId);
      setCalendars(data || []);
    } catch (error) {
      console.error('Failed to load calendars', error);
    } finally {
      setLoadingCalendars(false);
    }
  };

  // Fetch frequent contacts
  const fetchFrequentContacts = async () => {
    setLoadingContacts(true);
    try {
      const data = await getFrequentContacts(workspaceId, userId);
      setFrequentContacts(data || []);
    } catch (error) {
      console.error('Failed to load frequent contacts', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
    fetchFrequentContacts();
  }, [workspaceId, userId]);

  // Toggle calendar visibility
  const { execute: toggleVisibility } = useAction(toggleCalendarVisibilityAction, {
    onSuccess: () => {
      fetchCalendars();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to toggle calendar');
    },
  });

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      {/* Mini Calendar */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{format(currentDate, 'MMMM yyyy')}</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="py-1 text-muted-foreground font-medium">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const isSelected = isSameDay(day, currentDate);

            return (
              <button
                key={idx}
                onClick={() => setCurrentDate(day)}
                className={cn(
                  'aspect-square rounded-md text-xs transition-colors',
                  !isCurrentMonth && 'text-muted-foreground/50',
                  isCurrentMonth && 'text-foreground hover:bg-accent',
                  isDayToday && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  isSelected && !isDayToday && 'bg-secondary text-secondary-foreground'
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Teammates */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teammates"
            className="pl-9 text-sm"
            onFocus={() => toast.info('Teammate search functionality ready')}
          />
        </div>
      </div>

      {/* My Calendars */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">My calendars</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onManageAccounts}
            title="Add calendar"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-1">
          {loadingCalendars ? (
            <div className="text-xs text-muted-foreground p-2">Loading...</div>
          ) : calendars.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2">No calendars</div>
          ) : (
            calendars.map((calendar) => (
              <div 
                key={calendar.id}
                className="flex items-center gap-2 rounded p-2 hover:bg-accent cursor-pointer"
                onClick={() => toggleVisibility({ id: calendar.id, workspaceId })}
              >
                <Checkbox 
                  checked={calendar.is_visible ?? true}
                  className="pointer-events-none"
                />
                <div className="flex h-4 w-4 items-center justify-center">
                  {(calendar.provider === 'gmail' || calendar.provider === 'google') ? (
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                  ) : (calendar.provider === 'outlook' || calendar.provider === 'microsoft') ? (
                    <div className="h-3 w-3 rounded-full bg-blue-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-sky-500" />
                  )}
                </div>
                <span className="text-sm flex-1 truncate" title={calendar.provider_account_email}>
                  {calendar.provider_account_email}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Frequently met with */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Frequently met with</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onManageFrequentContacts}
            title="Manage frequent contacts"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-1">
          {loadingContacts ? (
            <div className="text-xs text-muted-foreground p-2">Loading...</div>
          ) : frequentContacts.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2">No contacts yet</div>
          ) : (
            frequentContacts.slice(0, 5).map((contact) => (
              <div 
                key={contact.id}
                className="flex items-center gap-2 rounded p-2 hover:bg-accent cursor-pointer"
                onClick={onManageFrequentContacts}
                title={contact.email}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm flex-1 truncate">{contact.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Accounts */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Accounts</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onManageAccounts}
            title="Manage calendar accounts"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 p-2">
            <Checkbox id="birthdays" />
            <label htmlFor="birthdays" className="text-sm text-muted-foreground cursor-pointer">Birthdays</label>
          </div>
          <div className="flex items-center gap-2 p-2">
            <Checkbox id="holidays" />
            <label 
              htmlFor="holidays" 
              className="text-sm text-muted-foreground cursor-pointer truncate"
              title="Holidays in United Kingdom"
            >
              Holidays (UK)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Right Sidebar Component
function RightSidebar({ 
  currentDate, 
  events,
  onEventClick,
  onResolveOverdue,
  onRefreshTasks,
}: { 
  currentDate: Date; 
  events: any[];
  onEventClick?: (event: any) => void;
  onResolveOverdue?: () => void;
  onRefreshTasks?: () => void;
}) {
  const todayEvents = events.filter((event) => {
    const eventDate = parseISO(event.start_time);
    return isSameDay(eventDate, currentDate);
  }).sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      {/* Overdue Task Alert */}
      <Card className="mb-4 border-yellow-600 bg-yellow-500/10 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-600">
              1 task scheduled past deadline
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    className="mt-2 w-full bg-yellow-600 text-white hover:bg-yellow-700"
                    onClick={onResolveOverdue}
                  >
                    Resolve
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reschedule, mark as complete, or dismiss this overdue task</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>

      {/* Today's Schedule */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Today</span>
            {' '}
            {format(currentDate, 'EEE, MMM d')}
          </h3>
        </div>

        <div className="space-y-2">
          {todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events today</p>
          ) : (
            todayEvents.map((event) => {
              const startTime = parseISO(event.start_time);
              const endTime = parseISO(event.end_time);
              return (
                <div key={event.id} className="space-y-1">
                  <div
                    className="animated-border flex w-full items-start gap-2 rounded p-2 hover:bg-primary/5 text-left transition-colors cursor-pointer"
                  >
                    <Checkbox 
                      className="mt-1" 
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => onEventClick?.(event)}
                    >
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          {format(addDays(currentDate, 1), 'EEE, MMM d')}
        </h3>
        <div className="space-y-2">
          {events
            .filter((event) => {
              const eventDate = parseISO(event.start_time);
              return isSameDay(eventDate, addDays(currentDate, 1));
            })
            .map((event) => {
              const startTime = parseISO(event.start_time);
              const endTime = parseISO(event.end_time);
              return (
                <div
                  key={event.id}
                  className="animated-border flex w-full items-start gap-2 rounded p-2 hover:bg-primary/5 text-left transition-colors cursor-pointer"
                >
                  <Checkbox 
                    className="mt-1" 
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => onEventClick?.(event)}
                  >
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Refresh Tasks Button */}
      <Button 
        variant="outline" 
        className="mt-auto"
        onClick={onRefreshTasks}
      >
        <Clock className="mr-2 h-4 w-4" />
        Refresh all tasks
      </Button>
    </div>
  );
}

// Event Detail Modal Component
function EventDetailModal({ 
  event, 
  workspaceId,
  onClose,
  onUpdate,
  onDelete,
}: { 
  event: any; 
  workspaceId: string;
  onClose: () => void;
  onUpdate?: (updates: any) => void;
  onDelete?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(event.title || '');
  const [editedDescription, setEditedDescription] = useState(event.description || '');
  const [editedLocation, setEditedLocation] = useState(event.location || '');
  const [editedStartTime, setEditedStartTime] = useState(event.start_time);
  const [editedEndTime, setEditedEndTime] = useState(event.end_time);
  const [isAllDay, setIsAllDay] = useState(event.is_all_day || false);
  const [visibility, setVisibility] = useState<'default' | 'public' | 'private'>(event.visibility || 'default');
  const [isRecurring, setIsRecurring] = useState(event.is_recurring || false);
  const [recurrenceRule, setRecurrenceRule] = useState(event.recurrence_rule || '');
  const [attendees, setAttendees] = useState<any[]>(event.attendees || []);
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [conferenceType, setConferenceType] = useState<'none' | 'zoom' | 'meet' | 'teams'>(
    event.conference_data?.type || 'none'
  );
  const [conferenceUrl, setConferenceUrl] = useState(event.conference_data?.url || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // UI state for showing edit sections
  const [showGuestsInput, setShowGuestsInput] = useState(attendees.length > 0);
  const [showDescriptionInput, setShowDescriptionInput] = useState(!!event.description);
  const [showLocationInput, setShowLocationInput] = useState(!!event.location);
  const [showConferenceInput, setShowConferenceInput] = useState(conferenceType !== 'none');
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(isRecurring);
  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false);

  const startTime = parseISO(editedStartTime);
  const endTime = parseISO(editedEndTime);

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    
    try {
      const updates: any = {
        title: editedTitle,
        description: editedDescription || null,
        location: editedLocation || null,
        startTime: editedStartTime,
        endTime: editedEndTime,
        isAllDay,
        visibility,
        isRecurring,
        recurrenceRule: recurrenceRule || null,
        attendees,
        conferenceData: conferenceType !== 'none' ? {
          type: conferenceType,
          url: conferenceUrl,
        } : null,
      };
      
      await onUpdate(updates);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addGuest = () => {
    if (!newGuestEmail || !newGuestEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (attendees.some(a => a.email === newGuestEmail)) {
      toast.error('This guest has already been added');
      return;
    }
    
    setAttendees([...attendees, { 
      email: newGuestEmail, 
      name: newGuestEmail.split('@')[0],
      responseStatus: 'needsAction' 
    }]);
    setNewGuestEmail('');
    setIsEditing(true);
  };

  const removeGuest = (email: string) => {
    setAttendees(attendees.filter(a => a.email !== email));
    setIsEditing(true);
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600';
      case 'declined': return 'text-red-600';
      case 'tentative': return 'text-yellow-600';
      default: return 'text-muted-foreground';
    }
  };

  const getResponseStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'declined': return 'Declined';
      case 'tentative': return 'Maybe';
      default: return 'Pending';
    }
  };

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-start justify-between sticky top-0 bg-background pb-2">
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-lg font-semibold"
              placeholder="Event title"
              autoFocus
            />
          ) : (
            <DialogTitle 
              className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {editedTitle || event.title}
            </DialogTitle>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Date and Time */}
        <div className="flex items-start gap-3 text-sm">
          <CalendarIcon className="h-4 w-4 text-muted-foreground mt-2" />
          {isEditing ? (
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Start</label>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeLocal(editedStartTime)}
                    onChange={(e) => setEditedStartTime(new Date(e.target.value).toISOString())}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End</label>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeLocal(editedEndTime)}
                    onChange={(e) => setEditedEndTime(new Date(e.target.value).toISOString())}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <span 
              className="cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {format(startTime, 'MMM d')} {' '}
              {isAllDay ? 'All day' : `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`}
            </span>
          )}
        </div>

        {/* Quick Options */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge 
            variant={isAllDay ? "default" : "outline"}
            className="cursor-pointer transition-all"
            onClick={() => {
              setIsAllDay(!isAllDay);
              setIsEditing(true);
            }}
          >
            All day
          </Badge>
          <Badge 
            variant={showRecurrenceOptions ? "default" : "outline"}
            className="cursor-pointer transition-all"
            onClick={() => setShowRecurrenceOptions(!showRecurrenceOptions)}
          >
            <ChevronDown className={cn("h-3 w-3 mr-1 transition-transform", showRecurrenceOptions && "rotate-180")} />
            Repeat
          </Badge>
          <Badge 
            variant="outline"
            className="cursor-pointer"
            onClick={() => toast.info('Travel time feature coming soon')}
          >
            Travel time
          </Badge>
        </div>

        {/* Recurrence Options */}
        {showRecurrenceOptions && (
          <div className="rounded border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  setIsRecurring(checked === true);
                  setIsEditing(true);
                }}
              />
              <label htmlFor="recurring" className="text-sm cursor-pointer">Enable recurrence</label>
            </div>
            {isRecurring && (
              <select
                value={recurrenceRule}
                onChange={(e) => {
                  setRecurrenceRule(e.target.value);
                  setIsEditing(true);
                }}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select frequency...</option>
                <option value="RRULE:FREQ=DAILY">Daily</option>
                <option value="RRULE:FREQ=WEEKLY">Weekly</option>
                <option value="RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Weekdays</option>
                <option value="RRULE:FREQ=MONTHLY">Monthly</option>
                <option value="RRULE:FREQ=YEARLY">Yearly</option>
              </select>
            )}
          </div>
        )}

        {/* Add Guests */}
        {showGuestsInput ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Guests</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={newGuestEmail}
                onChange={(e) => setNewGuestEmail(e.target.value)}
                placeholder="Add guest email..."
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addGuest();
                  }
                }}
              />
              <Button size="sm" onClick={addGuest}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {/* Attendees List */}
            <div className="space-y-1">
              {attendees.map((attendee, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded bg-muted p-2 group">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(attendee.name || attendee.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{attendee.email}</p>
                    <p className={cn("text-xs", getResponseStatusColor(attendee.responseStatus))}>
                      {getResponseStatusText(attendee.responseStatus)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeGuest(attendee.email)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button 
            className="flex w-full items-center gap-3 rounded p-2 text-left text-sm text-muted-foreground hover:bg-primary/5 transition-colors"
            onClick={() => setShowGuestsInput(true)}
          >
            <Users className="h-4 w-4" />
            <span>Add guests</span>
          </button>
        )}

        {/* Add Description */}
        {showDescriptionInput ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Description</span>
            </div>
            <textarea
              value={editedDescription}
              onChange={(e) => {
                setEditedDescription(e.target.value);
                setIsEditing(true);
              }}
              placeholder="Add event description..."
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : (
          <button 
            className="flex w-full items-center gap-3 rounded p-2 text-left text-sm text-muted-foreground hover:bg-primary/5 transition-colors"
            onClick={() => setShowDescriptionInput(true)}
          >
            <FileText className="h-4 w-4" />
            <span>Add a description</span>
          </button>
        )}

        {/* Conferencing */}
        {showConferenceInput ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Conferencing</span>
            </div>
            <select
              value={conferenceType}
              onChange={(e) => {
                setConferenceType(e.target.value as any);
                setIsEditing(true);
              }}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="none">No conferencing</option>
              <option value="zoom">Zoom Meeting</option>
              <option value="meet">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
            </select>
            {conferenceType !== 'none' && (
              <Input
                value={conferenceUrl}
                onChange={(e) => {
                  setConferenceUrl(e.target.value);
                  setIsEditing(true);
                }}
                placeholder="Meeting URL..."
                className="text-sm"
              />
            )}
          </div>
        ) : (
          <button 
            className="flex w-full items-center gap-3 rounded p-2 text-left text-sm text-muted-foreground hover:bg-primary/5 transition-colors"
            onClick={() => setShowConferenceInput(true)}
          >
            <Video className="h-4 w-4" />
            <span>No Conferencing</span>
          </button>
        )}

        {/* Add Location */}
        {showLocationInput ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Location</span>
            </div>
            <Input
              value={editedLocation}
              onChange={(e) => {
                setEditedLocation(e.target.value);
                setIsEditing(true);
              }}
              placeholder="Add location..."
              className="text-sm"
            />
          </div>
        ) : (
          <button 
            className="flex w-full items-center gap-3 rounded p-2 text-left text-sm text-muted-foreground hover:bg-primary/5 transition-colors"
            onClick={() => setShowLocationInput(true)}
          >
            <MapPin className="h-4 w-4" />
            <span>Add a location</span>
          </button>
        )}

        {/* Visibility */}
        <div 
          className="flex items-center gap-3 text-sm cursor-pointer hover:bg-primary/5 rounded p-2 transition-colors"
          onClick={() => setShowVisibilityOptions(!showVisibilityOptions)}
        >
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">
            {visibility === 'default' && 'Default visibility'}
            {visibility === 'public' && 'Public'}
            {visibility === 'private' && 'Private'}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showVisibilityOptions && "rotate-180")} />
        </div>
        
        {showVisibilityOptions && (
          <div className="rounded border border-border p-2 space-y-1 bg-muted/30">
            {(['default', 'public', 'private'] as const).map((v) => (
              <button
                key={v}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                  visibility === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                onClick={() => {
                  setVisibility(v);
                  setShowVisibilityOptions(false);
                  setIsEditing(true);
                }}
              >
                {v === 'default' && 'Default visibility'}
                {v === 'public' && 'Public - Anyone can see'}
                {v === 'private' && 'Private - Only you can see'}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border sticky bottom-0 bg-background">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  // Reset all values
                  setEditedTitle(event.title || '');
                  setEditedDescription(event.description || '');
                  setEditedLocation(event.location || '');
                  setEditedStartTime(event.start_time);
                  setEditedEndTime(event.end_time);
                  setIsAllDay(event.is_all_day || false);
                  setVisibility(event.visibility || 'default');
                  setIsRecurring(event.is_recurring || false);
                  setRecurrenceRule(event.recurrence_rule || '');
                  setAttendees(event.attendees || []);
                  setConferenceType(event.conference_data?.type || 'none');
                  setConferenceUrl(event.conference_data?.url || '');
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={onDelete}
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Month View Component
function MonthView({
  currentDate,
  events,
  getEventsForDate,
  onEventClick,
}: {
  currentDate: Date;
  events: any[];
  getEventsForDate: (date: Date) => any[];
  onEventClick: (event: any) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventColor = (index: number) => {
    const colors = [
      'bg-primary/80 border border-primary/30 hover:bg-primary/90 hover:border-primary/50',
      'bg-purple-600/80 border border-purple-600/30 hover:bg-purple-600/90 hover:border-purple-600/50',
      'bg-sky-600/80 border border-sky-600/30 hover:bg-sky-600/90 hover:border-sky-600/50',
      'bg-rose-600/80 border border-rose-600/30 hover:bg-rose-600/90 hover:border-rose-600/50',
      'bg-amber-600/80 border border-amber-600/30 hover:bg-amber-600/90 hover:border-amber-600/50',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((weekDay) => (
          <div
            key={weekDay}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {weekDay}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);
          const weekNumber = Math.floor(idx / 7);

          return (
            <div
              key={idx}
              className={cn(
                'border-b border-r border-border/80 dark:border-border p-2 transition-all hover:bg-primary/5 hover:border-primary/30',
                !isCurrentMonth && 'bg-muted/40 dark:bg-muted/20',
                isCurrentMonth && weekNumber % 2 === 1 && 'bg-muted/15 dark:bg-muted/5'
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isDayToday && 'bg-primary text-primary-foreground',
                    !isDayToday && isCurrentMonth && 'text-foreground',
                    !isDayToday && !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, eventIdx) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      'w-full cursor-pointer rounded px-2 py-1 text-left text-xs font-medium transition-all text-white shadow-sm',
                      getEventColor(eventIdx)
                    )}
                  >
                    <div className="truncate">{event.title}</div>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-2 text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ 
  currentDate, 
  events, 
  onEventClick 
}: { 
  currentDate: Date; 
  events: any[];
  onEventClick: (event: any) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get events that overlap with a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);
      
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Check if event overlaps with this day
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Time grid container with header */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* Week day headers - Fixed at top */}
          <div className="sticky top-0 z-10 grid grid-cols-8 border-b border-border bg-background">
            <div className="border-r border-border p-3">
              <div className="text-xs text-muted-foreground">GMT</div>
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="flex flex-col items-center justify-center border-r border-border p-3"
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, 'EEE d')}
                </div>
                <div
                  className={cn(
                    'mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                    isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-8">
            {hours.map((hour) => (
              <React.Fragment key={`hour-${hour}`}>
                {/* Time label */}
                <div
                  className={cn(
                    "border-b border-r border-border/70 dark:border-border p-2 text-right text-xs text-muted-foreground",
                    hour % 2 === 0 ? "bg-muted/20 dark:bg-muted/10" : ""
                  )}
                  style={{ height: '60px' }}
                >
                  {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                </div>
                {/* Day columns */}
                {weekDays.map((day) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "relative border-b border-r border-border/70 dark:border-border transition-all hover:bg-primary/5 hover:border-primary/30",
                      hour % 2 === 0 ? "bg-muted/20 dark:bg-muted/10" : ""
                    )}
                    style={{ height: '60px' }}
                  >
                    {/* Only render events in the first hour (hour === 0) to avoid duplicates */}
                    {hour === 0 && getEventsForDay(day).map((event) => (
                      <EventBlock 
                        key={event.id} 
                        event={event}
                        day={day}
                        onClick={() => onEventClick(event)} 
                      />
                    ))}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Day View Component
function DayView({ 
  currentDate, 
  events,
  onEventClick 
}: { 
  currentDate: Date; 
  events: any[];
  onEventClick: (event: any) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventStart = parseISO(event.start_time);
      return getHours(eventStart) === hour;
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="relative">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div
              key={hour}
              className={cn(
                "flex border-b border-border/80 dark:border-border",
                hour % 2 === 0 ? "bg-muted/20 dark:bg-muted/10" : ""
              )}
              style={{ minHeight: '70px' }}
            >
              {/* Time label */}
              <div className="w-20 flex-shrink-0 border-r border-border/80 dark:border-border p-2 text-right">
                <span className="text-xs font-medium text-muted-foreground">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                </span>
              </div>
              {/* Event area */}
              <div className="relative flex-1 p-2 transition-all hover:bg-primary/5">
                {hourEvents.map((event) => (
                  <EventBlockDetailed 
                    key={event.id} 
                    event={event} 
                    onClick={() => onEventClick(event)} 
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Event Block for Week View
function EventBlock({ event, onClick, day }: { event: any; onClick: () => void; day?: Date }) {
  const startTime = parseISO(event.start_time);
  const endTime = parseISO(event.end_time);
  
  // If day is provided, calculate the portion of the event that falls on this specific day
  let effectiveStart = startTime;
  let effectiveEnd = endTime;
  
  if (day) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Clip the event to this day's boundaries
    effectiveStart = startTime < dayStart ? dayStart : startTime;
    effectiveEnd = endTime > dayEnd ? dayEnd : endTime;
  }
  
  const durationMinutes = differenceInMinutes(effectiveEnd, effectiveStart);
  const minutes = getMinutes(effectiveStart);
  const hours = getHours(effectiveStart);
  
  // Calculate position and height based on 60px per hour
  const HOUR_HEIGHT = 60; // pixels per hour
  const topPosition = (hours * HOUR_HEIGHT) + ((minutes / 60) * HOUR_HEIGHT);
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 30);

  const getEventColor = () => {
    // Rotate through colors based on event id
    const colors = [
      'bg-primary/80 border border-primary/30 hover:bg-primary/90 hover:border-primary/50',
      'bg-purple-600/80 border border-purple-600/30 hover:bg-purple-600/90 hover:border-purple-600/50',
      'bg-sky-600/80 border border-sky-600/30 hover:bg-sky-600/90 hover:border-sky-600/50',
      'bg-rose-600/80 border border-rose-600/30 hover:bg-rose-600/90 hover:border-rose-600/50',
      'bg-amber-600/80 border border-amber-600/30 hover:bg-amber-600/90 hover:border-amber-600/50',
    ];
    const hash = event.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute left-0 right-0 overflow-hidden rounded px-2 py-1 text-left text-xs text-white transition-all shadow-sm z-10",
        getEventColor()
      )}
      style={{
        top: `${topPosition}px`,
        height: `${height}px`,
      }}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-[10px] opacity-90">
        {format(effectiveStart, 'h:mm a')}
      </div>
    </button>
  );
}

// Event Block for Day View (more detailed)
function EventBlockDetailed({ event, onClick }: { event: any; onClick: () => void }) {
  const startTime = parseISO(event.start_time);
  const endTime = parseISO(event.end_time);

  const getEventColor = () => {
    const colors = [
      'border-l-primary border-primary/20 bg-primary/10 hover:bg-primary/20 hover:border-primary/40',
      'border-l-purple-600 border-purple-600/20 bg-purple-600/10 hover:bg-purple-600/20 hover:border-purple-600/40',
      'border-l-sky-600 border-sky-600/20 bg-sky-600/10 hover:bg-sky-600/20 hover:border-sky-600/40',
      'border-l-rose-600 border-rose-600/20 bg-rose-600/10 hover:bg-rose-600/20 hover:border-rose-600/40',
      'border-l-amber-600 border-amber-600/20 bg-amber-600/10 hover:bg-amber-600/20 hover:border-amber-600/40',
    ];
    const hash = event.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "mb-2 w-full overflow-hidden rounded border-l-4 border p-3 text-left transition-all",
        getEventColor()
      )}
    >
      <div className="space-y-1">
        <h4 className="font-semibold">{event.title}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {event.location}
          </div>
        )}
        {event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
      </div>
    </button>
  );
}

