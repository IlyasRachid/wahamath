'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ImageSize = { width: number; height: number };

function ZoomControls({ zoom, onZoom, onFullscreen, fullscreen }: { zoom: number; onZoom: (value: number) => void; onFullscreen?: () => void; fullscreen?: boolean }) {
  return <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Réduire le zoom" onClick={() => onZoom(Math.max(0.5, zoom - 0.25))}><ZoomOut className="h-4 w-4" /></Button>
    <span className="min-w-11 px-1 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Augmenter le zoom" onClick={() => onZoom(Math.min(2.5, zoom + 0.25))}><ZoomIn className="h-4 w-4" /></Button>
    {onFullscreen && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={fullscreen ? 'Quitter le plein écran' : 'Afficher l’énoncé en plein écran'} onClick={onFullscreen}>{fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>}
  </div>;
}

function ImageViewport({ src, alt, zoom, fullscreen = false }: { src: string; alt: string; zoom: number; fullscreen?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState<ImageSize | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [maxHeight, setMaxHeight] = useState(640);

  useEffect(() => {
    const updateHeight = () => setMaxHeight(Math.max(320, Math.floor(window.innerHeight * (fullscreen ? 0.8 : 0.62))));
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [fullscreen]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const updateWidth = () => setFrameWidth(frame.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const availableWidth = Math.max(1, frameWidth - 32);
  const fitScale = naturalSize ? Math.min(availableWidth / naturalSize.width, maxHeight / naturalSize.height, 1) : 1;
  const baseWidth = naturalSize ? naturalSize.width * fitScale : availableWidth;
  const baseHeight = naturalSize ? naturalSize.height * fitScale : maxHeight;
  const displayedWidth = baseWidth * zoom;
  const displayedHeight = baseHeight * zoom;
  const viewportHeight = zoom <= 1 ? Math.max(180, Math.min(maxHeight, displayedHeight)) : Math.max(180, Math.min(maxHeight, baseHeight));

  return <div ref={frameRef} className={fullscreen ? 'flex min-h-0 flex-1 p-3 sm:p-6' : 'p-4 sm:p-8'}>
    <div className="w-full overflow-auto rounded-lg bg-secondary/40" style={{ height: viewportHeight }}>
      <div className="flex min-h-full min-w-full items-start justify-center" style={{ width: Math.max(frameWidth, displayedWidth), height: Math.max(viewportHeight, displayedHeight) }}>
        <img src={src} alt={alt} onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="shrink-0 rounded-lg shadow-lg ring-1 ring-border" style={{ width: displayedWidth, height: displayedHeight }} />
      </div>
    </div>
  </div>;
}

export function ExerciseImageViewer({ src, alt, title }: { src: string | null; alt: string; title: string }) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  if (!src) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">L’image de cet énoncé est temporairement indisponible.</CardContent></Card>;
  }

  const controls = <div className="flex items-center gap-1">
    <ZoomControls zoom={zoom} onZoom={setZoom} onFullscreen={() => setFullscreen((open) => !open)} />
    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
      <a href={src} target="_blank" rel="noreferrer" aria-label="Ouvrir l’énoncé dans un nouvel onglet" title="Ouvrir dans un nouvel onglet">
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  </div>;
  return <>
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2.5"><p className="text-sm font-medium text-foreground">Énoncé de l’exercice</p>{controls}</div>
      <CardContent className="p-0"><ImageViewport src={src} alt={alt} zoom={zoom} /></CardContent>
    </Card>
    {fullscreen && <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"><div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="truncate text-sm font-medium text-foreground">{title}</p><ZoomControls zoom={zoom} onZoom={setZoom} onFullscreen={() => setFullscreen(false)} fullscreen /></div><ImageViewport src={src} alt={alt} zoom={zoom} fullscreen /></div>}
  </>;
}
