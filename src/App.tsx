import React from 'react'
import { Building2 } from 'lucide-react'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Building2 className="w-16 h-16 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Tej IT Solutions
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Billing & Management System
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Frontend Development Mode
            </h2>
            <p className="text-gray-600 mb-6">
              This is the React frontend for the Tej IT Solutions Billing System. 
              The main application runs on the Flask backend.
            </p>
            <a 
              href="http://localhost:5000" 
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Access Main Application
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App