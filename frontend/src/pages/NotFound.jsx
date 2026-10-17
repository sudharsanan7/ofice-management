import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center p-6">
      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
        <FileQuestion className="h-12 w-12" />
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The page you are looking for doesn't exist or has been moved to another location.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" icon={Home}>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
