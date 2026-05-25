export function VideoEmbed({ url }: { url: string }) {
  const youtubeId = extractYouTubeId(url);
  const twitchClip = extractTwitchClip(url);

  if (youtubeId) {
    return (
      <div className="video-embed">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  if (twitchClip) {
    return (
      <div className="video-embed">
        <iframe
          src={`https://clips.twitch.tv/embed?clip=${twitchClip}&parent=${window.location.hostname}`}
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="video-link">
      🎬 {url}
    </a>
  );
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTwitchClip(url: string): string | null {
  const match = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
