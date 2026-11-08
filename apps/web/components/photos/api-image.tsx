'use client';

import { useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from 'cn';
import { endSession, refreshOnce } from '@/lib/api/auth-middleware';

type Stage = 'initial' | 'retrying' | 'failed';

// The browser loads <img> itself, so the API client's 401 → refresh middleware never sees these requests.
// On the first error we run the same single-flight refresh and reload once; a second failure shows a placeholder.
export function ApiImage({
  src,
  alt,
  className,
  loading = 'lazy',
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }) {
  // Keyed by src so a new src starts from scratch without an effect.
  const [state, setState] = useState<{ src: string; stage: Stage }>({ src, stage: 'initial' });
  const stage: Stage = state.src === src ? state.stage : 'initial';

  async function handleError() {
    if (stage !== 'initial') {
      setState({ src, stage: 'failed' });
      return;
    }
    if (await refreshOnce()) {
      setState({ src, stage: 'retrying' });
    } else {
      endSession();
      setState({ src, stage: 'failed' });
    }
  }

  if (stage === 'failed') {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'bg-muted text-muted-foreground flex flex-col items-center justify-center gap-2 p-4 text-center text-sm',
          className,
        )}
        style={{ width: props.width, height: props.height }}
      >
        <ImageOff className="size-6" aria-hidden />
        <span>Не вдалося завантажити фото</span>
      </div>
    );
  }

  // Cache-busting param forces the browser to re-request (a failed response may be cached) with the fresh cookie.
  const url = stage === 'retrying' ? `${src}${src.includes('?') ? '&' : '?'}retry=1` : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- the API needs the cookie; no Next image optimizer
    <img
      {...props}
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
    />
  );
}
