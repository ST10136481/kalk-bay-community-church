import React, { useState, useEffect } from 'react';
import { Play, Download, Plus, LogOut, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ref, get, push, set} from 'firebase/database';
import { database } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import AudioUpload from './AudioUpload';

interface SermonData {
  id: string;
  title: string;
  date: string;
  audioUrl: string;
  description?: string;
}

const SermonCard = React.memo(({ sermon }: { sermon: SermonData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = sermon.audioUrl;
    link.setAttribute('download', `${sermon.title}.mp3`);
    link.setAttribute('target', '_blank');
    link.click();
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{sermon.title}</h3>
          <p className="text-gray-500 text-sm">
            {format(new Date(sermon.date), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePlay}
            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {sermon.description && (
        <p className="text-gray-600 text-sm mb-4">{sermon.description}</p>
      )}

      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500 w-12">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="flex-grow h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-blue-700"
        />
        <span className="text-xs text-gray-500 w-12">
          {formatTime(duration)}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={sermon.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
});

SermonCard.displayName = 'SermonCard';

const Sermons = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [sermons, setSermons] = useState<SermonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const { user, login, logout } = useAuth();

  useEffect(() => {
    const fetchSermons = async () => {
      try {
        const sermonsRef = ref(database, 'sermons');
        console.log('Fetching sermons...');
        const snapshot = await get(sermonsRef);
        console.log('Snapshot received:', snapshot.exists());
        
        if (!snapshot.exists()) {
          console.log('No sermons found');
          setSermons([]);
          setLoading(false);
          return;
        }

        const sermonsData: SermonData[] = [];
        
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          console.log('Processing sermon:', data);
          
          if (data) {
            sermonsData.push({
              id: childSnapshot.key || '',
              title: data.title || 'Untitled Sermon',
              date: data.date || new Date().toISOString(),
              audioUrl: data.audioUrl || '',
              description: data.description || ''
            });
          }
        });

        const sortedSermons = sermonsData.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        console.log('Final processed sermons:', sortedSermons);
        setSermons(sortedSermons);
      } catch (error) {
        console.error('Error fetching sermons:', error);
        toast.error('Failed to load sermons');
      } finally {
        setLoading(false);
      }
    };

    fetchSermons();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(loginData.email, loginData.password);
    if (success) {
      setShowLogin(false);
      toast.success('Logged in successfully!');
    } else {
      toast.error('Invalid credentials');
    }
  };

  const handleUploadComplete = async (url: string, title: string, description: string) => {
    try {
      const sermonsRef = ref(database, 'sermons');
      const newSermonRef = push(sermonsRef);
      
      const newSermon = {
        title: title,
        date: new Date().toISOString(),
        audioUrl: url,
        description: description || ''
      };
      
      await set(newSermonRef, newSermon);
      
      const sermonWithId = { 
        id: newSermonRef.key!, 
        ...newSermon 
      };
      
      setSermons(prev => [sermonWithId, ...prev]);
      setShowUpload(false);
      toast.success('Sermon uploaded successfully!');
    } catch (error) {
      console.error('Error saving sermon:', error);
      toast.error('Failed to save sermon');
    }
  };

  if (loading) {
    return (
      <section id="sermons" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-800 mb-12">Recent Sermons</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-md animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-48" />
                    <div className="h-4 bg-gray-200 rounded w-32" />
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="sermons" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800">Recent Sermons</h2>
          {user ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Sermon
              </button>
              <button
                onClick={logout}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Admin Login
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {sermons.length === 0 ? (
            <p className="text-center text-gray-600">No sermons available yet.</p>
          ) : (
            sermons.map((sermon) => (
              <SermonCard key={sermon.id} sermon={sermon} />
            ))
          )}
        </div>

        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">Admin Login</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showUpload && (
          <AudioUpload
            onClose={() => setShowUpload(false)}
            onUploadComplete={handleUploadComplete}
          />
        )}
      </div>
    </section>
  );
};

export default Sermons;