import React from 'react';
import Navigation from './Navigation';
import '../app/globals.css';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1 container py-8">
                {children}
            </main>
            <footer className="py-4 border-t text-center text-sm text-gray-500">
                © 2025 Mstreet Financial LTD. All rights reserved.
            </footer>
        </div>
    );
}
