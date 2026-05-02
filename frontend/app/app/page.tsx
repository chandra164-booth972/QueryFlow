"use client";

import React from 'react';
import QueryFlowApp from '../../components/QueryFlowApp';
import AuthGate from '../../components/AuthGate';

export default function AppPage() {
  return (
    <AuthGate>
      <QueryFlowApp />
    </AuthGate>
  );
}
