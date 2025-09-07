// pages/index.tsx - Enhanced Original Landing Page
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { TrialSignup } from "../components/TrialSignup";

export default function LandingPage() {
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<'loading' | 'new' | 'trial' | 'subscribed' | 'expired'>('loading');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const checkUserStatus = () => {
      try {
        // Check subscription first
        const subscription = localStorage.getItem("bookfoldar_subscription");
        if (subscription) {
          const subData = JSON.parse(subscription);
          if (subData.active || 
              (subData.status === 'active' && subData.expiryDate > Date.now()) ||
              subData.plan) {
            setUserStatus('subscribed');
            return;
          }
        }

        // Check trial
        const trial = localStorage.getItem("bookfoldar_trial");
        if (trial) {
          const trialData = JSON.parse(trial);
          if (trialData.expiryDate && Date.now() < trialData.expiryDate) {
            setUserStatus('trial');
            return;
          } else {
            setUserStatus('expired');
            return;
          }
        }

        // New user
        setUserStatus('new');
      } catch (error) {
        console.error('Error checking user status:', error);
        setUserStatus('new');
      }
    };

    checkUserStatus();
  }, [isClient]);

  const handleAccessApp = () => {
    router.push('/app');
  };

  const getRemainingTrialDays = () => {
    try {
      const trial = localStorage.getItem("bookfoldar_trial");
      if (trial) {
        const trialData = JSON.parse(trial);
        const remaining = Math.ceil((trialData.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
        return Math.max(0, remaining);
      }
    } catch (error) {
      console.error('Error calculating trial days:', error);
    }
    return 0;
  };

  const renderTrialSignupSection = () => {
    if (!isClient || userStatus === 'loading') {
      return (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-gray-300/20 rounded w-3/4 mb-4"></div>
            <div className="h-12 bg-gray-300/20 rounded w-full mb-4"></div>
            <div className="h-4 bg-gray-300/20 rounded w-1/2"></div>
          </div>
        </div>
      );
    }

    switch (userStatus) {
      case 'subscribed':
        return (
          <div className="bg-green-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-green-400/30 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-green-300">🎉 Welcome Back, Subscriber!</h3>
            <p className="text-sm text-gray-200 mb-6">
              You have full access to all BookfoldAR features. Continue your precision folding journey.
            </p>
            <button
              onClick={handleAccessApp}
              className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center"
            >
              <span className="mr-2">🚀</span>
              Launch BookfoldAR
            </button>
            <div className="mt-4 text-xs text-gray-300 text-center">
              Full access • All features unlocked • AR precision folding
            </div>
          </div>
        );

      case 'trial':
        const remainingDays = getRemainingTrialDays();
        return (
          <div className="bg-blue-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-blue-400/30 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-blue-300">✨ Welcome Back!</h3>
            <p className="text-sm text-gray-200 mb-2">
              Your free trial is active with <span className="font-bold text-blue-300">{remainingDays} days remaining</span>.
            </p>
            <p className="text-sm text-gray-200 mb-6">
              Continue exploring all BookfoldAR features.
            </p>
            <button
              onClick={handleAccessApp}
              className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center mb-3"
            >
              <span className="mr-2">📱</span>
              Continue to BookfoldAR
            </button>
            <Link 
              href="/paywall" 
              className="block w-full text-center bg-green-600/20 hover:bg-green-600/30 px-4 py-2 rounded text-green-300 text-sm transition-colors"
            >
              Upgrade to Premium
            </Link>
          </div>
        );

      case 'expired':
        return (
          <div className="bg-yellow-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-yellow-400/30 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-300">⏰ Trial Expired</h3>
            <p className="text-sm text-gray-200 mb-6">
              Your 7-day free trial has ended. Subscribe to continue using all BookfoldAR features.
            </p>
            <Link 
              href="/paywall"
              className="block w-full text-center bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors mb-3"
            >
              <span className="mr-2">💎</span>
              View Subscription Plans
            </Link>
            <div className="mt-4 text-xs text-gray-300 text-center">
              Choose from Monthly • Yearly • Lifetime plans
            </div>
          </div>
        );

      default: // 'new' user
        return (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
            <h3 className="text-2xl font-semibold mb-4">🚀 Start Your 7-Day Free Trial</h3>
            <p className="text-sm text-gray-200 mb-6">
              Full access to all AR features. No premium tiers - get the complete BookfoldAR experience.
            </p>
            <TrialSignup />
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-900 text-white">
      {/* Hero Section with Enhanced Trial Signup */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-purple-700 px-4">
        <h1 className="text-5xl font-bold mb-4">📚 BookfoldAR</h1>
        <p className="text-lg max-w-2xl mx-auto text-gray-100 mb-8">
          Precision book folding with augmented reality assistance.  
          Transform complex patterns into an intuitive, step-by-step AR experience.
        </p>
        
        {/* Enhanced Dynamic Trial Signup Card */}
        {renderTrialSignupSection()}

        {/* Quick benefits preview */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h4 className="font-semibold mb-2">AR Precision</h4>
            <p className="text-sm text-gray-200">Overlay digital guides directly onto your book</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🎤</div>
            <h4 className="font-semibold mb-2">Voice Control</h4>
            <p className="text-sm text-gray-200">Navigate hands-free while folding</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">📄</div>
            <h4 className="font-semibold mb-2">PDF Import</h4>
            <p className="text-sm text-gray-200">Import pattern files automatically</p>
          </div>
        </div>

        {/* Quick access note for returning users */}
        {isClient && userStatus !== 'new' && (
          <div className="mt-8 text-sm text-gray-300">
            💡 <strong>Tip:</strong> You can also bookmark <code className="bg-black/20 px-2 py-1 rounded">yoursite.com/app</code> for direct access
          </div>
        )}
      </section>

      {/* Control Panel Overview */}
      <section className="max-w-6xl mx-auto py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-8">Control Panel Overview</h2>
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/control_panel.png"
              alt="Control Panel Overview"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
          <div className="md:w-1/2">
            <p className="text-gray-300 text-lg text-left leading-relaxed">
              The BookfoldAR Control Panel is your command center for precision book folding.  
              Six collapsible steps guide you through the entire process - book dimensions, AR calibration, 
              voice control, page navigation, PDF import, and manual instructions all work together to 
              transform complex folding patterns into an intuitive AR workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Features Sections */}
      <section className="max-w-6xl mx-auto py-16 px-6 space-y-20">
        {/* Step 1: Book Dimensions */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/book_dimensions.png"
              alt="Book Dimensions Setup"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 1: Book Dimensions</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Define your book's page height, top, and bottom padding.  
              BookfoldAR creates a perfectly scaled AR workspace that matches your book's proportions.
              This ensures every fold mark appears exactly where it should on your physical book.
            </p>
          </div>
        </div>

        {/* Step 2: Enhanced AR Camera */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/enhanced_ar_camera.png"
              alt="Enhanced AR Camera Interface"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 2: Enhanced AR Camera</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Start the camera and overlay digital guides onto your real book with glassmorphism UI.  
              Features include real-time calibration, scaling controls, and grid overlays for 
              professional accuracy. Alignment guides help you position your book perfectly.
            </p>
          </div>
        </div>

        {/* Step 3: Voice Control */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/voice_control.png"
              alt="Voice Control Interface"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 3: Voice Control</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Navigate pages and marks hands-free with natural voice commands like "next page" 
              or "show all marks". Keep your hands free for folding while BookfoldAR handles 
              navigation automatically. Perfect for complex patterns requiring focus.
            </p>
          </div>
        </div>

        {/* Step 4: AR Page & Mark Navigation */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/ar_page_&_mark_Navigation.png"
              alt="AR Page and Mark Navigation"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 4: AR Page & Mark Navigation</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Navigate through complex folding patterns with smart page and mark tracking.  
              Switch between showing all marks at once or focus on a single fold for precision work. 
              Visual feedback and particle effects make it easy to see your progress.
            </p>
          </div>
        </div>

        {/* Step 5: PDF Import */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/pdf_import.png"
              alt="PDF Import Feature"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 5: PDF Import</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Drag and drop pattern files to automatically extract measurements.  
              BookfoldAR's smart parser cleans and converts various formats into AR-ready 
              folding instructions. Supports most common book folding pattern formats.
            </p>
          </div>
        </div>

        {/* Step 6: Manual Marking Instructions */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/manual_marking_instructions.png"
              alt="Manual Marking Instructions"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 6: Manual Marking Instructions</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Paste or type custom measurements in any format you have.  
              Smart auto-formatting cleans messy input and converts it into AR-ready instructions. 
              Handles various formats including comma-separated, pipe-separated, and mixed formats.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Show appropriate content based on user status */}
      {isClient && (userStatus === 'new' || userStatus === 'loading') && (
        <section className="text-center py-20 bg-gradient-to-r from-purple-700 to-blue-600">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Book Folding?</h2>
          <p className="max-w-3xl mx-auto text-xl text-gray-100 mb-8 leading-relaxed">
            Join crafters worldwide using BookfoldAR for precision folding. 
            Get complete access to all features during your 7-day trial - no restrictions, 
            no premium tiers, just the full BookfoldAR experience.
          </p>
          
          {/* Bottom Trial Signup */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
            <h3 className="text-2xl font-semibold mb-4">Start Your Free Trial Now</h3>
            <p className="text-sm text-gray-200 mb-6">
              Enter your email below to begin your 7-day free trial
            </p>
            <TrialSignup />
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto text-sm text-gray-300">
            <div className="flex items-center justify-center">
              <span className="text-green-400 mr-2">✅</span>
              Complete AR system access
            </div>
            <div className="flex items-center justify-center">
              <span className="text-green-400 mr-2">✅</span>
              All control panel features
            </div>
            <div className="flex items-center justify-center">
              <span className="text-green-400 mr-2">✅</span>
              Voice control & PDF import
            </div>
            <div className="flex items-center justify-center">
              <span className="text-green-400 mr-2">✅</span>
              No feature restrictions
            </div>
          </div>
        </section>
      )}

      {/* Alternative CTA for existing users */}
      {isClient && (userStatus === 'trial' || userStatus === 'subscribed' || userStatus === 'expired') && (
        <section className="text-center py-20 bg-gradient-to-r from-purple-700 to-blue-600">
          <h2 className="text-4xl font-bold mb-6">
            {userStatus === 'subscribed' ? 'Continue Your BookfoldAR Journey' : 
             userStatus === 'trial' ? 'Make the Most of Your Trial' : 
             'Your BookfoldAR Experience Awaits'}
          </h2>
          <p className="max-w-3xl mx-auto text-xl text-gray-100 mb-8 leading-relaxed">
            {userStatus === 'subscribed' ? 'You have full access to all BookfoldAR features. Create amazing book art with precision AR guidance.' :
             userStatus === 'trial' ? `You have ${getRemainingTrialDays()} days left to explore all features. Upgrade anytime to continue your journey.` :
             'Your trial has ended, but your book folding journey can continue. Choose a plan to unlock all features.'}
          </p>
          
          <div className="flex justify-center space-x-4 max-w-lg mx-auto">
            {userStatus === 'subscribed' && (
              <button
                onClick={handleAccessApp}
                className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold text-white transition-colors flex items-center"
              >
                <span className="mr-2">🚀</span>
                Launch BookfoldAR
              </button>
            )}
            
            {userStatus === 'trial' && (
              <>
                <button
                  onClick={handleAccessApp}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors flex items-center"
                >
                  <span className="mr-2">📱</span>
                  Continue Trial
                </button>
                <Link
                  href="/paywall"
                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors flex items-center"
                >
                  <span className="mr-2">⭐</span>
                  Upgrade Now
                </Link>
              </>
            )}
            
            {userStatus === 'expired' && (
              <Link
                href="/paywall"
                className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold text-white transition-colors flex items-center"
              >
                <span className="mr-2">💎</span>
                View Plans
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 py-8 px-4 text-center text-gray-400">
        <p>&copy; 2025 BookfoldAR. Transform your book folding with AR precision.</p>
      </footer>
    </div>
  );
}