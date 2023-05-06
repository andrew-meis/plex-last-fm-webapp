from app import db, ma
from flask_marshmallow import Schema


def camelcase(s):
    parts = iter(s.split("_"))
    return next(parts) + "".join(i.title() for i in parts)


class CamelCaseSchema(Schema):

    def on_bind_field(self, field_name, field_obj):
        field_obj.data_key = camelcase(field_obj.data_key or field_name)


class Account(db.Model):
    __tablename__ = 'accounts'
    id = db.Column(db.Integer, primary_key=True)
    lastfm_username = db.Column(db.String)
    lastfm_api_key = db.Column(db.String)
    plex_account_id = db.Column(db.Integer)
    plex_db_file = db.Column(db.String)
    plex_device_id = db.Column(db.Integer)
    plex_music_library_id = db.Column(db.Integer)
    last_hex_update = db.Column(db.DateTime)

    def __repr__(self):
        return f'<Account: {self.id} {self.lastfm_username}>'


class AddedTrack(db.Model):
    __tablename__ = 'added_tracks'
    id = db.Column(db.Integer, primary_key=True)
    rating_key = db.Column(db.Integer)


class Scrobble(db.Model):
    __tablename__ = 'scrobbles'
    id = db.Column(db.Integer, primary_key=True)
    concat_lastfm = db.Column(db.String, index=True)
    artist = db.Column(db.String, index=True)
    album = db.Column(db.String, index=True)
    track = db.Column(db.String, index=True)
    played_at = db.Column(db.Integer)
    hash = db.Column(db.String)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), index=True)
    status = db.Column(db.String)
    __table_args__ = (db.UniqueConstraint('hash', name='_hash_uc'),)

    def processing_data(self):
        account = db.session.query(Account).first()
        return {
            'account_id': account.plex_account_id,
            'guid': self.match.plex_track.guid,
            'metadata_type': 10,
            'library_section_id': account.plex_music_library_id,
            'grandparent_title': self.match.plex_track.artist,
            'parent_index': self.match.plex_track.parent_index,
            'parent_title': self.match.plex_track.album,
            'index': self.match.plex_track.track_index,
            'title': self.match.plex_track.track,
            'viewed_at': self.played_at,
            'grandparent_guid': self.match.plex_track.grandparent_guid,
            'device_id': account.plex_device_id
        }

    def __repr__(self):
        return f'<Scrobble: {self.concat_lastfm} {self.played_at}>'


class Match(db.Model):
    __tablename__ = 'matches'
    id = db.Column(db.Integer, primary_key=True)
    concat_lastfm = db.Column(db.String, index=True)
    plex_id = db.Column(db.Integer, db.ForeignKey('plex_tracks.id'), index=True)
    scrobbles = db.relationship('Scrobble', backref='match', lazy='dynamic')
    __table_args__ = (db.UniqueConstraint('concat_lastfm', name='_concat_lastfm_uc'),)

    def __repr__(self):
        return f'<Match: {self.concat_lastfm} {self.plex_id}>'


class Plex(db.Model):
    __tablename__ = 'plex_tracks'
    id = db.Column(db.Integer, primary_key=True)
    rating_key = db.Column(db.Integer)
    concat_plex = db.Column(db.String, index=True)
    artist = db.Column(db.String)
    artist_feat = db.Column(db.String)
    grandparent_guid = db.Column(db.String, index=True)
    album = db.Column(db.String)
    parent_guid = db.Column(db.String, index=True)
    parent_index = db.Column(db.Integer)
    track = db.Column(db.String)
    track_index = db.Column(db.Integer)
    guid = db.Column(db.String, index=True)
    match = db.relationship('Match', backref='plex_track', lazy='dynamic')
    __table_args__ = (db.UniqueConstraint('rating_key', name='_rating_key_uc'),)

    def __repr__(self):
        return f'<Plex Track: {self.concat_plex}>'


class AccountSchema(ma.SQLAlchemySchema, CamelCaseSchema):
    class Meta:
        model = Account

    id = ma.auto_field()
    lastfm_username = ma.auto_field()
    lastfm_api_key = ma.auto_field()
    plex_account_id = ma.auto_field()
    plex_db_file = ma.auto_field()
    plex_device_id = ma.auto_field()
    plex_music_library_id = ma.auto_field()


class PlexSchema(ma.SQLAlchemySchema, CamelCaseSchema):
    class Meta:
        model = Plex

    id = ma.auto_field()
    rating_key = ma.auto_field()
    concat_plex = ma.auto_field()
    artist = ma.auto_field()
    artist_feat = ma.auto_field()
    grandparent_guid = ma.auto_field()
    album = ma.auto_field()
    parent_guid = ma.auto_field()
    parent_index = ma.auto_field()
    track = ma.auto_field()
    track_index = ma.auto_field()
    guid = ma.auto_field()


class ScrobbleSchema(ma.SQLAlchemySchema, CamelCaseSchema):
    class Meta:
        model = Scrobble

    id = ma.auto_field()
    concat_lastfm = ma.auto_field()
    artist = ma.auto_field()
    album = ma.auto_field()
    track = ma.auto_field()
    played_at = ma.auto_field()
    hash = ma.auto_field()
    match_id = ma.auto_field()
    status = ma.auto_field()


class MatchSchema(ma.SQLAlchemySchema, CamelCaseSchema):
    class Meta:
        model = Match

    id = ma.auto_field()
    concat_lastfm = ma.auto_field()
    scrobbles = ma.auto_field()
    plex_track = ma.Nested(PlexSchema)
