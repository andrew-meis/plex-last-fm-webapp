# Project Showcase: Plex Media Server <-> last.fm playcount synchronization
### Background
**last.fm** is a music-oriented social media platform that allows users to track their music listening habits. The basis of the data collected by last.fm is deemed the "scrobble," which represents a single instance of a playcount of a single track. last.fm records the artist, album, and track title, and the timestamp for the play instance. last.fm integrates with many popular music streaming apps such as Spotify and Apple Music to allow users of these applications to track their listening habits.

**Plex Media Server** allows users to remotely stream their personal media collections, including music collections. Plex Media Server provides a number of tools for users to engage with their listening history, for example, to listen to their most frequently played tracks in a given year. Plex Media Server uses a local database to record these data.
### Objective
The purpose of this project is to synchronize last.fm "scrobbles" with the recorded playcounts in the Plex Media Server database. In this way, users of Plex Media Server can have their listening habits across streaming services reflected in the playlists generated by the media server.
### Implementation
Using the public API, last.fm scrobble information for a given user is downloaded to a local SQLite database. A matching track is searched for within the user's Plex Media Server library. If an exact match is found, the ID of the last.fm track and the media server track are related in the database. If no match is found, the user is given the option to manually match the track or indicate that there is no matching track (e.g., in the case where a user listened to a song on a streaming service that was not present in their local media library).

After a chunk of tracks are matched, updated playcount data is pushed to the Plex Media Server SQLite database.
Finally, a web interface provides the user with options to remove matches, match newly added tracks, or download the latest batch of "scrobbles" from last.fm.
### Tools Used
- SQLite -> updating and inserting rows in the Plex Media Server database
- pandas Python library -> data wrangling, efficient table joining, filtering, indexing
- SQLalchemy Python library ->  Object-relation mapper (ORM) for maintaining the local database used by this tool, and efficiently serving the data to the web-based frontend interface.
### Key Outcomes
- Efficient -> able to handle 100k+ data operations in seconds
- Maintainable -> user has options for deleting or updating the data stored by the app
- User friendly -> web interface provides intuitive tools for data manipulation, including tables with various filter capabilities, a dashboard with quick stats, and a matching interface that offers suggestions based on fuzzy string matching.