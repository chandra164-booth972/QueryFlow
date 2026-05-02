"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearToken } from '../lib/api';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('queryflow_token');
    if (!token) {
      router.replace('/signin');
      return;
    }
    apiFetch<{ id: string }>('/auth/me').catch(() => {
      clearToken();
      router.replace('/signin');
    });
  }, [router]);

  return <>{children}</>;
}
