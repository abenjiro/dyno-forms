import React from 'react';
import { StudioHeader } from '@/components/builder/StudioHeader';
import { ComponentPalette } from '@/components/builder/ComponentPalette';
import { BuilderCanvas } from '@/components/builder/BuilderCanvas';
import { PropertyInspector } from '@/components/builder/PropertyInspector';

export const metadata = {
  title: 'Visual Form Builder Studio — Dyno Forms',
  description: 'Hierarchical drag-and-drop form builder with live API bindings and real-time previews.',
};

export default function BuilderPage() {
  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Studio Top Navigation Bar */}
      <StudioHeader />

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette Library */}
        <ComponentPalette />

        {/* Center: Interactive Drag-and-Drop Canvas / Live Preview */}
        <BuilderCanvas />

        {/* Right: Property & API Inspector */}
        <PropertyInspector />
      </div>
    </div>
  );
}
