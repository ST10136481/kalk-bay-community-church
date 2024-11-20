import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { ref, get, push, set, query, orderByChild } from 'firebase/database';
import { database } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import type { Event } from '../types';
import EventModal from './EventModal';

const EventCard = React.memo(({ event, onEdit, isAdmin }: { event: Event; onEdit?: () => void; isAdmin?: boolean }) => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const addToCalendar = () => {
    toast.success('Event added to calendar!');
  };

  return (
    <div
      ref={ref}
      className={`bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg transition-all duration-700 transform ${
        inView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      <div className="h-48 overflow-hidden relative">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        {isAdmin && onEdit && (
          <button
            onClick={onEdit}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          >
            <Edit className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{event.title}</h3>
        <div className="flex items-center text-gray-600 mb-4">
          <Clock className="h-5 w-5 mr-2" />
          <span>{event.time}</span>
          {event.date && <span className="ml-2">| {event.date}</span>}
        </div>
        <p className="text-gray-600 mb-4">{event.description}</p>
        <button
          onClick={addToCalendar}
          className="flex items-center justify-center w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Calendar className="h-5 w-5 mr-2" />
          Add to Calendar
        </button>
      </div>
    </div>
  );
});

EventCard.displayName = 'EventCard';

const getNextOccurrences = (dayOfWeek: number, count: number): string[] => {
  const dates: string[] = [];
  let currentDate = new Date();

  while (dates.length < count) {
    // If we're past the day this week, move to next week
    if (currentDate.getDay() > dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + (7 - currentDate.getDay() + dayOfWeek));
    } else {
      // Move to the target day this week
      currentDate.setDate(currentDate.getDate() + (dayOfWeek - currentDate.getDay()));
    }

    dates.push(currentDate.toISOString().split('T')[0]);
    // Move to next week
    currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return dates;
};

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRef = ref(database, 'events');
        const eventsQuery = query(eventsRef, orderByChild('date'));
        
        console.log('Attempting to fetch events...');
        const snapshot = await get(eventsQuery);
        console.log('Snapshot received:', snapshot.exists());
        
        if (!snapshot.exists()) {
          console.log('No events found in database');
          setEvents([]);
          setLoading(false);
          return;
        }

        const allEvents: Event[] = [];
        
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          console.log('Processing event:', data);
          
          if (data) {
            // Handle recurring events
            if (data.recurrence && data.recurrence.frequency === 'weekly') {
              // Generate next 4 occurrences for recurring events
              const nextDates = getNextOccurrences(data.recurrence.dayOfWeek, 4);
              nextDates.forEach((date, index) => {
                allEvents.push({
                  id: `${childSnapshot.key}-${index}`,
                  title: data.title,
                  time: data.time,
                  date: date,
                  description: data.description,
                  imageUrl: data.imageUrl,
                  type: 'regular',
                  recurrence: data.recurrence
                });
              });
            } else {
              // Handle one-time events
              allEvents.push({
                id: childSnapshot.key || '',
                title: data.title,
                time: data.time,
                date: data.date,
                description: data.description,
                imageUrl: data.imageUrl,
                type: data.type || 'special'
              });
            }
          }
        });
        
        // Sort events by date
        const sortedEvents = allEvents.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        console.log('Final processed events:', sortedEvents);
        setEvents(sortedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          toast.error(`Failed to load events: ${error.message}`);
        } else {
          toast.error('Failed to load events: Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleSaveEvent = async (eventData: Partial<Event>) => {
    try {
      if (eventData.type === 'regular' && !eventData.recurrence) {
        // Set recurrence for regular events
        eventData.recurrence = {
          dayOfWeek: eventData.title?.includes('Sunday') ? 0 : 3, // Sunday = 0, Wednesday = 3
          frequency: 'weekly'
        };
      }

      const eventsRef = ref(database, 'events');
      const newEventRef = push(eventsRef);
      await set(newEventRef, eventData);
      
      toast.success('Event saved successfully!');
      // Refresh events list
      window.location.reload();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
      throw error;
    }
  };

  if (loading) {
    return (
      <section id="events" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800">Upcoming Events</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-lg h-96 animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-20 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="events" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Upcoming Events</h2>
          {user && (
            <button
              onClick={() => {
                setSelectedEvent(undefined);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Event
            </button>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isAdmin={!!user}
              onEdit={() => {
                setSelectedEvent(event);
                setShowModal(true);
              }}
            />
          ))}
        </div>

        {showModal && (
          <EventModal
            event={selectedEvent}
            onClose={() => {
              setShowModal(false);
              setSelectedEvent(undefined);
            }}
            onSave={handleSaveEvent}
            isEditing={!!selectedEvent}
          />
        )}
      </div>
    </section>
  );
};

export default Events;