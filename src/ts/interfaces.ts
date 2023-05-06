export interface Account {
  id: number;
  lastfmApiKey: string;
  lastfmUsername: string;
  plexAccountId: number;
  plexDbFile: string;
  plexMusicLibraryId: number;
}

export interface NewTrack {
  addedId: number;
  concatPlex: string;
}

export interface HomeData {
  lastHexUpdate: string;
  matchedCount: number;
  scrobbleCount: number;
  status: string;
  plexCount: number;
  processCount: number;
  unreviewedCount: number;
  newTracksCount: number;
}

export interface NewTracksData {
  newTracks: NewTrack[];
  newTracksCount: number;
}

export interface PlexTrack {
  album: string;
  artist: string;
  artistFeat: string;
  concatPlex: string;
  grandparentGuid: string;
  guid: string;
  id: number;
  parentGuid: string;
  parentIndex: number;
  ratingKey: number;
  track: string;
  trackIndex: number;
}

export interface InspectMatch {
  id: number;
  concatLastfm: string;
  playcount: number;
  plexTrack: PlexTrack;
  scrobbles: number[];
}

export interface Scrobble {
  album: string;
  artist: string;
  concatLastfm: string;
  hash: string;
  id: number;
  matchId: number;
  playedAt: number;
  status: string;
  track: string;
}

export interface Suggestion {
  concatPlex: string;
  id: number;
}

export interface InspectResponse {
  count: number;
  matches: InspectMatch[],
  page: number;
}

export interface MatchResponse {
  scrobble: Scrobble;
  status: boolean;
  suggestions: Suggestion[];
}

export interface ScrobbleDateRange {
  start: number;
  end: number;
}
