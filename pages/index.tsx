// pages/index.tsx
import React from "react";
import Image from "next/image";
import { TrialSignup } from "../components/TrialSignup";

export default function LandingPage() {
  return (
    <div className="bg-gray-900 text-white">
      {/* Hero Section with Trial Signup */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-purple-700 px-4">
        <h1 className="text-5xl font-bold mb-4">📚 BookfoldAR</h1>
        <p className="text-lg max-w-2xl mx-auto text-gray-100 mb-8">
          Precision book folding with augmented reality assistance.  
          Transform complex patterns into an intuitive, step-by-step AR experience.
        </p>
        
        {/* Enhanced Trial Signup Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
          <h3 className="text-2xl font-semibold mb-4">🚀 Start Your 7-Day Free Trial</h3>
          <p className="text-sm text-gray-200 mb-6">
            Full access to all AR features. No premium tiers - get the complete BookfoldAR experience.
          </p>
          <TrialSignup />
        </div>

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

      {/* Final CTA Section */}
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

      {/* Footer */}
      <footer className="bg-gray-800 py-8 px-4 text-center text-gray-400">
        <p>&copy; 2025 BookfoldAR. Transform your book folding with AR precision.</p>
      </footer>
    </div>
  );
}