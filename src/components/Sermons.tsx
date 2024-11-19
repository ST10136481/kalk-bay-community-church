import React, { useState, useEffect } from 'react';
import { Play, Download, Plus, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = sermon.audioUrl;
    link.download = `${sermon.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <Play className={`h-5 w-5 ${isPlaying ? 'text-blue-800' : ''}`} />
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
      <audio
        ref={audioRef}
        src={sermon.audioUrl}
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
        const sermonsQuery = query(collection(db, 'sermons'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(sermonsQuery);
        const sermonsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SermonData));
        setSermons(sermonsData);
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

  const handleUploadComplete = async (url: string, title: string) => {
    try {
      const newSermon = {
        title,
        date: new Date().toISOString(),
        audioUrl: url,
      };
      
      const docRef = await addDoc(collection(db, 'sermons'), newSermon);
      const sermonWithId = { id: docRef.id, ...newSermon };
      setSermons(prev => [sermonWithId, ...prev]);
      
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