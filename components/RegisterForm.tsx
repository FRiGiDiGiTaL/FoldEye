import { useState } from 'react';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ Registered! Trial ends on ${new Date(data.trialEnds).toLocaleDateString()}`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-gray-900/60 rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold text-white text-center">Start Your Free 7-Day Trial</h2>

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-md transition disabled:opacity-50"
      >
        {loading ? 'Registering...' : 'Start Trial'}
      </button>

      {message && (
        <p className="text-sm text-center text-gray-300">{message}</p>
      )}
    </form>
  );
}
