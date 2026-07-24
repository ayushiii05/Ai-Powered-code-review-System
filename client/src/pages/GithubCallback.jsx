import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const GithubCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      toast.error('No authorization code found');
      navigate('/github');
      return;
    }

    const authenticateGithub = async () => {
      try {
        const { data } = await api.post('/github-auth/callback', { code });
        toast.success(data.message || 'GitHub successfully linked!');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to authenticate with GitHub');
      } finally {
        setIsProcessing(false);
        navigate('/github');
      }
    };

    authenticateGithub();
  }, [searchParams, navigate]);

  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center flex-col">
      <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connecting your GitHub account...</h2>
      <p className="text-gray-500 mt-2">Please wait while we secure your connection.</p>
    </div>
  );
};

export default GithubCallback;
