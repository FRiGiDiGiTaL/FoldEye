// pages/index.tsx
import React, { useState } from "react";
import Image from "next/image";
import { TrialSignup } from "../components/TrialSignup";

export default function LandingPage() {
  return (
    <div className="bg-gray-900 text-white">
      {/* Hero Section with Trial Signup */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-purple-700 px-4">
        <h1 className="text-5xl font-bold mb-4">📚 BookfoldAR</h1>
        <p className="text-lg max-w-2xl mx-auto text-gray-100 mb-6">
          Precision book folding with augmented reality assistance.  
          Transform complex patterns into an intuitive, step-by-step AR experience.
        </p>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 max-w-lg mx-auto border border-white/20">
          <h3 className="text-xl font-semibold mb-4">🚀 Start Your 7-Day Free Trial</h3>
          <p className="text-sm text-gray-200 mb-4">
            Full access to all AR features. No premium tiers - get the complete BookfoldAR experience.
          </p>
          <TrialSignup />
        </div>
      </section>

      {/* Detailed Feature Breakdown */}
      {/* Control Panel Overview */}
      <section className="max-w-6xl mx-auto py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-8">Control Panel Overview</h2>
        <div className="flex flex-col md:flex-row items-center gap-10">
          <Image
            src="/control_panel.png"
            alt="Control Panel Overview"
            width={500}
            height={350}
            className="rounded-lg shadow-lg"
          />
          <p className="text-gray-300 text-lg text-left">
            The BookfoldAR Control Panel is your command center for precision book folding.  
            Collapsible steps, AR calibration, all work together to transform complex folding patterns into an intuitive AR workflow.
          </p>
        </div>
      </section>

      {/* Features Sections */}
      <section className="max-w-6xl mx-auto py-16 px-6 space-y-20">
        {/* Step 1: Book Dimensions */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <Image
            src="/book_dimensions.png"
            alt="Book Dimensions"
            width={500}
            height={350}
            className="rounded-lg shadow-lg"
          />
          <div>
            <h3 className="text-2xl font-bold mb-2">Step 1: Book Dimensions</h3>
            <p className="text-gray-300">
              Define your book’s page height, top, and bottom padding.  
              BookfoldAR creates a perfectly scaled AR workspace that matches your book’s proportions.
            </p>
          </div>
        </div>

        {/* Step 2: Enhanced AR Camera */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <Image
            src="/enhanced_ar_camera.png"
            alt="Enhanced AR Camera"
            width={500}
            height={350}
            className="rounded-lg shadow-lg"
          />
          <div>
            <h3 className="text-2xl font-bold mb-2">Step 2: Enhanced AR Camera</h3>
            <p className="text-gray-300">
              Overlay digital guides onto your book with real-time feedback.  
              Includes calibration, scaling, and grid overlays for professional accuracy.
            </p>
          </div>
        </div>

        {/* Step 3: Voice Control */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <Image
            src="/voice_control.png"
            alt="Voice Control"
            width={500}
            height={350}
            className="rounded-lg shadow-lg"
          />
          <div>
            <h3 className="text-2xl font-bold mb-2">Step 3: Voice Control</h3>
            <p className="text-gray-300">
              Navigate pages and marks hands-free with natural voice commands.  
              Stay focused on folding while BookfoldAR handles navigation.
            </p>
          </div>
        </div>

        {/* Step 4: AR Page & Mark Navigation */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <Image
            src="/ar_page_&_mark_Navigation.png"
            alt="AR Page and Mark Navigation"
            width={500}
            height={350}
            className="rounded-lg shadow-lg"
          />
          <div>
            <h3 className="text-2xl font-bold mb-2">Step 4: AR Page & Mark Navigation</h3>
            <p className="text-gray-300">
              Navigate through complex folding patterns with smart page/mark tracking.  
              Switch between all-marks mode or focus on a single fold for precision.
            </p>
          </div>
        </div>

        {/* Step 5: PDF Import */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <Image
            src="/pdf_import.png"
            alt="PDF Import"
            width={500}
            height={350}
            className="rounded-lg shadow-lg"
          />
          <div>
            <h3 className="text-2xl font-bold mb-2">Step 5: PDF Import</h3>
            <p className="text-gray-300">
              Drag and drop pattern files to auto-extract measurements.  
              BookfoldAR cleans and converts them into AR-ready folding instructions.
            </p>
          </div>
        </div>

        {/* Step 6: Manual Marking Instructions */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <Image
            src="/manual_marking_instructions.png"
            alt="Manual Marking Instructions"
            width={500}
            height={350}
            className="rounded-lg shadow-lg"
          />
          <div>
            <h3 className="text-2xl font-bold mb-2">Step 6: Manual Marking Instructions</h3>
            <p className="text-gray-300">
              Paste or type custom measurements in any format.  
              Smart auto-formatting cleans input and converts it into AR-ready instructions.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-20 bg-gradient-to-r from-purple-700 to-blue-600">
        <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Book Folding?</h2>
        <p className="max-w-2xl mx-auto text-gray-100 mb-6">
          Join crafters worldwide using BookfoldAR for precision folding. 
          Complete access to all features during your 7-day trial.
        </p>
        <TrialSignup />
        
        <div className="mt-8 text-sm text-gray-300">
          <p>✅ Complete AR system access</p>
          <p>✅ All control panel features</p>
          <p>✅ Voice control & PDF import</p>
          <p>✅ No feature restrictions</p>
        </div>
      </section>
    </div>
  );
}