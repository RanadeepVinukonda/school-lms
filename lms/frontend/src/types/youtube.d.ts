declare namespace YT {
  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    getCurrentTime(): number;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    pauseVideo(): void;
    destroy(): void;
  }
  interface PlayerOptions {
    videoId: string;
    width?: number | string;
    height?: number | string;
    playerVars?: PlayerVars;
    events?: Events;
  }
  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    start?: number;
    end?: number;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
  }
  interface Events {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
  }
  interface PlayerEvent {
    target: Player;
  }
  interface OnStateChangeEvent {
    data: number;
    target: Player;
  }
  const PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}
