'use client';

import { redirect } from 'next/navigation';
import { use } from 'react';

export default function SettingsPage({ params }) {
  var resolvedParams = use(params);
  redirect('/dashboard/salon/' + resolvedParams.salonId + '/settings/general');
}
