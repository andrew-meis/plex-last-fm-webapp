from app import app, db
from app.models import Account, AddedTrack, Match, Plex, Scrobble

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db,
        'Account': Account,
        'AddedTrack': AddedTrack,
        'Match': Match,
        'Plex': Plex,
        'Scrobble': Scrobble
    }