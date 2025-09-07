// components/TrialSignup.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';

export const TrialSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        // Store trial info locally
        localStorage.setItem('bookfoldar_trial', JSON.stringify({
          email,
          startDate: Date.now(),
          expiryDate: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        }));
        
        // Redirect to app
        router.push('/app');
      } else {
        setError('Please enter a valid email address');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg text-gray-900 bg-white border-2 border-transparent focus:border-blue-500 focus:outline-none"
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-6 py-3 rounded-lg font-semibold transition-colors"
      >
        {loading ? 'Starting Trial...' : 'Start Free 7-Day Trial'}
      </button>
      
      <p className="text-xs text-gray-400">
        No credit card required. Full access to all features.
      </p>
    </form>
  );
};