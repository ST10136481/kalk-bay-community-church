import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import type { Event } from '../types';
import EventModal from './EventModal';

const PERMANENT_EVENTS: Event[] = [
  {
    id: 'sunday-service',
    title: 'Sunday Service',
    time: '10:00',
    description: 'Weekly worship service for all ages. Join us for praise, prayer, and fellowship.',
    imageUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80',
    isPermanent: true,
    type: 'regular'
  },
  {
    id: 'bible-study',
    title: 'Bible Study',
    time: '19:00',
    description: 'Wednesday evening Bible study. Dive deeper into God\'s word with our community.',
    imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80',
    isPermanent: true,
    type: 'regular'
  }
];

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
      className={`bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-700 transform ${
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

const Events = () => {
  const [events, setEvents] = useState<Event[]>(PERMANENT_EVENTS);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsQuery = query(collection(db, 'events'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(eventsQuery);
        const specialEvents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Event));
        
        setEvents([...PERMANENT_EVENTS, ...specialEvents]);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleSaveEvent = async (eventData: Partial<Event>) => {
    try {
      if (selectedEvent?.isPermanent) {
        const eventRef = doc(db, 'events', selectedEvent.id);
        await updateDoc(eventRef, { time: eventData.time });
        
        setEvents(events.map(event => 
          event.id === selectedEvent.id 
            ? { ...event, time: eventData.time! }
            : event
        ));
      } else if (selectedEvent?.id) {
        const eventRef = doc(db, 'events', selectedEvent.id);
        await updateDoc(eventRef, eventData);
        
        setEvents(events.map(event =>
          event.id === selectedEvent.id
            ? { ...event, ...eventData }
            : event
        ));
      } else {
        const docRef = await addDoc(collection(db, 'events'), eventData);
        const newEvent = { id: docRef.id, ...eventData } as Event;
        setEvents(prevEvents => [...prevEvents, newEvent]);
      }
      
      toast.success('Event saved successfully!');
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
    <section id="events" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800">Upcoming Events</h2>
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