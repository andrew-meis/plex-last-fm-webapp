import hashlib
import numpy as np
import pandas as pd
import requests
import sqlite3
import time
from app import db
from app.models import Account, AddedTrack, Match, Plex, Scrobble
from sqlalchemy import func, select


cols_filter = [
    'id_track',
    'title_track',
    'original_title_track',
    'index_track',
    'guid_track',
    'title_album',
    'index_album',
    'guid_album',
    'title',
    'guid',
    'file'
]

rename = {
    'id_track': 'rating_key',
    'title_track': 'track',
    'original_title_track': 'artist_feat',
    'index_track': 'track_index',
    'guid_track': 'guid',
    'title_album': 'album',
    'index_album': 'parent_index',
    'guid_album': 'parent_guid',
    'title': 'artist',
    'guid': 'grandparent_guid'
}


"""
-------------------------- PLEX DATABASE ----------------------------
"""


def create_settings_row(guid, created_at, updated_at):
    insert_sql = '''INSERT INTO metadata_item_settings (account_id, guid, created_at, updated_at) VALUES (?, ?, ?, ?)'''
    account = db.session.query(Account).first()
    with sqlite3.connect(account.plex_db_file) as conn:
        c = conn.cursor()
        c.execute(insert_sql, [account.plex_account_id, guid, created_at, updated_at])
        conn.commit()
    return


def update_settings_row(guid, viewed_at, view_count):
    update_sql = '''UPDATE metadata_item_settings SET last_viewed_at=?, view_count=? WHERE account_id=? AND guid=?'''
    account = db.session.query(Account).first()
    with sqlite3.connect(account.plex_db_file) as conn:
        c = conn.cursor()
        c.execute(update_sql, [viewed_at, view_count, account.plex_account_id, guid])
        conn.commit()
    return


def add_scrobbles_to_plex():
    select_settings_guids = '''SELECT metadata_item_settings.guid, metadata_items.metadata_type
                               FROM metadata_item_settings
                               LEFT JOIN metadata_items ON metadata_item_settings.guid = metadata_items.guid
                               WHERE metadata_item_settings.account_id=?
                                   AND metadata_items.metadata_type = 8 
                                   OR metadata_items.metadata_type = 9
                                   OR metadata_items.metadata_type = 10
                               ORDER BY metadata_items.metadata_type'''
    account = db.session.query(Account).first()
    scrobbles = db.session.query(Scrobble).filter(Scrobble.status == 'matched').all()
    scrobbles_processing_df = pd.DataFrame.from_records([scrobble.processing_data() for scrobble in scrobbles])
    with sqlite3.connect(account.plex_db_file) as conn:
        scrobbles_processing_df.to_sql('metadata_item_views', con=conn, if_exists='append', index=False)
    id_list_unq = np.array(np.unique([scrobble.match.plex_id for scrobble in scrobbles])).tolist()
    track_info = [{'guid': x, 'count': y, 'viewed_at': z} for (x, y, z) in
                  (db.session.query(Plex.guid, func.count(Plex.match), func.max(Scrobble.played_at))
                   .join(Match, Plex.id == Match.plex_id)
                   .join(Scrobble, Match.id == Scrobble.match_id)
                   .filter(Plex.id.in_(id_list_unq))
                   .group_by(Plex.guid).all())]
    album_guid_list = [item[0] for item in (db.session.query(Plex.parent_guid)
                                            .filter(Plex.id.in_(id_list_unq))
                                            .group_by(Plex.parent_guid).all())]
    album_info = [{'guid': x, 'count': y, 'viewed_at': z} for (x, y, z) in
                  (db.session.query(Plex.parent_guid, func.count(Plex.match), func.max(Scrobble.played_at))
                   .join(Match, Plex.id == Match.plex_id)
                   .join(Scrobble, Match.id == Scrobble.match_id)
                   .filter(Plex.parent_guid.in_(album_guid_list))
                   .group_by(Plex.parent_guid).all())]
    artist_guid_list = [item[0] for item in (db.session.query(Plex.grandparent_guid)
                                             .filter(Plex.id.in_(id_list_unq))
                                             .group_by(Plex.grandparent_guid).all())]
    artist_info = [{'guid': x, 'count': y, 'viewed_at': z} for (x, y, z) in
                   (db.session.query(Plex.grandparent_guid, func.count(Plex.match), func.max(Scrobble.played_at))
                    .join(Match, Plex.id == Match.plex_id)
                    .join(Scrobble, Match.id == Scrobble.match_id)
                    .filter(Plex.grandparent_guid.in_(artist_guid_list))
                    .group_by(Plex.grandparent_guid).all())]
    all_info = track_info + album_info + artist_info
    li_all_guids = [x['guid'] for x in all_info]
    with sqlite3.connect(account.plex_db_file) as conn:
        li_settings_guids = (pd.read_sql(select_settings_guids, con=conn, params=[account.plex_account_id])['guid']
                             .to_list())
    li_new_guids = np.setdiff1d(li_all_guids, li_settings_guids)

    timestamp = int(time.time())
    created_at, updated_at = timestamp, timestamp

    for guid in li_new_guids:
        create_settings_row(guid, created_at, updated_at)

    for row in all_info:
        guid = row['guid']
        viewed_at = row['viewed_at']
        view_count = row['count']
        update_settings_row(guid, viewed_at, view_count)

    for scrobble in scrobbles:
        scrobble.status = 'processed'
    db.session.commit()

    return


def delete_plex_plays():
    account = db.session.query(Account).first()
    query = select(Plex)
    plex_df = pd.read_sql(query, con=db.engine)[['guid', 'parent_guid', 'grandparent_guid', 'album']]
    delete_sql = '''DELETE FROM metadata_item_views
                    WHERE account_id=? AND metadata_type=10 AND device_id!=?'''
    select_sql = '''SELECT guid, grandparent_guid, parent_title 
                    FROM metadata_item_views 
                    WHERE account_id=? AND metadata_type=10 AND device_id!=?'''
    update_sql = '''UPDATE metadata_item_settings
                    SET view_count=view_count-1
                    WHERE guid=? AND view_count>0 AND account_id=?'''
    select_all_guids = '''SELECT guid
                          FROM metadata_items
                          WHERE metadata_items.metadata_type = 8 
                              OR metadata_items.metadata_type = 9
                              OR metadata_items.metadata_type = 10'''
    select_settings_guids = '''SELECT metadata_item_settings.guid, metadata_items.metadata_type
                               FROM metadata_item_settings
                               LEFT JOIN metadata_items ON metadata_item_settings.guid = metadata_items.guid
                               WHERE metadata_item_settings.account_id=?
                                   AND metadata_items.metadata_type = 8 
                                   OR metadata_items.metadata_type = 9
                                   OR metadata_items.metadata_type = 10
                               ORDER BY metadata_items.metadata_type'''
    delete_settings_row = '''DELETE FROM metadata_item_settings
                             WHERE account_id=? AND guid=?'''
    with sqlite3.connect(account.plex_db_file) as conn:
        c = conn.cursor()
        li_all_guids = pd.read_sql(select_all_guids, con=conn)['guid'].to_list()
        li_settings_guids = (pd.read_sql(select_settings_guids, con=conn, params=[account.plex_account_id])['guid']
                             .to_list())
        s = set(li_all_guids)
        diff_guids = [x for x in li_settings_guids if x not in s]
        for guid in diff_guids:
            c.execute(delete_settings_row, [account.plex_account_id, guid])
        df = pd.read_sql(select_sql, con=conn, params=[account.plex_account_id, account.plex_device_id])
        df = df.merge(
            plex_df.drop_duplicates(),
            left_on=['guid', 'grandparent_guid', 'parent_title'],
            right_on=['guid', 'grandparent_guid', 'album'],
            how='left')
        guids = df['guid'].tolist() + df['parent_guid'].tolist() + df['grandparent_guid'].tolist()
        for guid in guids:
            c.execute(update_sql, [guid, account.plex_account_id])
        c.execute(delete_sql, [account.plex_account_id, account.plex_device_id])
        conn.commit()
    return


def get_plex_df():
    account = db.session.query(Account).first()
    select_tracks = f'''SELECT * FROM metadata_items WHERE metadata_type=10'''
    select_albums = f'''SELECT * FROM metadata_items WHERE metadata_type=9'''
    select_artists = f'''SELECT * FROM metadata_items WHERE metadata_type=8'''
    with sqlite3.connect(account.plex_db_file) as conn:
        df = pd.read_sql(select_tracks, conn)
        df_album_info = pd.read_sql(select_albums, conn)
        df_artist_info = pd.read_sql(select_artists, conn)
    df = df.filter(['id', 'title', 'original_title', 'index', 'guid', 'parent_id']).dropna()
    df = pd.DataFrame\
        .merge(df, df_album_info, left_on='parent_id', right_on='id', how='left', suffixes=('_track', '_album'))
    df = pd.DataFrame\
        .merge(df, df_artist_info, left_on='parent_id_album', right_on='id', how='left', suffixes=('', '_artist'))\
        .filter(cols_filter)\
        .rename(columns=rename)
    df.artist_feat = np.where(df.artist_feat.str.len() > 0, df.artist_feat, df.artist)
    df['concat_plex'] = df['artist_feat'] + ' --- ' + df['album'] + ' --- ' + df['track']
    return df


"""
-------------------------- HEX.FM DATABASE ----------------------------
"""


def delete_orphan_match_rows():
    matches = db.session.query(Match, func.count(Match.scrobbles)).outerjoin(Scrobble).group_by(Match.id).all()
    filtered = list(filter(lambda match: match[1] == 0, matches))
    for match in filtered:
        db.session.delete(match[0])
    db.session.commit()
    return


def delete_single_plex_play(scrobble, guids):
    account = db.session.query(Account).first()
    delete_sql = '''DELETE FROM metadata_item_views WHERE account_id=? AND viewed_at=? AND guid=?'''
    update_sql = '''UPDATE metadata_item_settings
                    SET view_count=view_count-1
                    WHERE guid=? AND view_count>0 AND account_id=?'''
    if len(guids) == 0:
      guids = [scrobble.match.plex_track.grandparent_guid,
              scrobble.match.plex_track.parent_guid,
              scrobble.match.plex_track.guid]
    with sqlite3.connect(account.plex_db_file) as conn:
        c = conn.cursor()
        c.execute(delete_sql, [account.plex_account_id, scrobble.played_at, scrobble.match.plex_track.guid])
        for guid in guids:
            c.execute(update_sql, [guid, account.plex_account_id])
        conn.commit()
    return


def process_unmatch(rating_key, delete_track=False, guids=[]):
    plex_track = db.session.query(Plex).filter(Plex.rating_key == int(rating_key)).one()
    matches = plex_track.match.all()
    for match in matches:
        scrobbles = match.scrobbles.all()
        for scrobble in scrobbles:
            if scrobble.status == 'processed':
                delete_single_plex_play(scrobble, guids)
            scrobble.match_id = None
            scrobble.status = None
        db.session.delete(match)
    if delete_track:
        added_tracks = db.session.query(AddedTrack).filter(AddedTrack.rating_key == int(rating_key)).all()
        for track in added_tracks:
            db.session.delete(track)
        db.session.delete(plex_track)
    return


def search_match(scrobble):
    match = (db.session.query(Match)
             .filter(func.lower(Match.concat_lastfm) == func.lower(scrobble.concat_lastfm))
             .first())
    if match:
        scrobble.match_id = match.id
        if match.plex_id == 0:
            scrobble.status = 'unmatched'
        else:
            scrobble.status = 'matched'
    else:
        plex_track = (db.session.query(Plex)
                      .filter(func.lower(Plex.concat_plex) == func.lower(scrobble.concat_lastfm))
                      .first())
        if plex_track:
            match = Match(concat_lastfm=scrobble.concat_lastfm, plex_id=plex_track.id)
            db.session.add(match)
            db.session.flush()
            scrobble.match_id = match.id
            scrobble.status = 'matched'
    return


def sqlite_conflict_hash(table, conn, keys, data_iter):
    from sqlalchemy.dialects.sqlite import insert

    data = [dict(zip(keys, row)) for row in data_iter]
    insert_stmt = insert(table.table).values(data)
    do_nothing_stmt = insert_stmt.on_conflict_do_nothing(
        index_elements=['hash']
    )
    conn.execute(do_nothing_stmt)


def scrobble_dataframe_to_db(df):
    df['concat_lastfm'] = df['artist'].fillna('') + ' --- ' + df['album'].fillna('') + ' --- ' + df['track'].fillna('')
    df = df[['concat_lastfm', 'artist', 'album', 'track', 'played_at']]
    df = df.sort_values(by=['played_at']).reset_index(drop=True)
    dicts = df[['artist', 'album', 'track', 'played_at']].to_dict('records')
    dicts = [' '.join(map(str, d.values())).lower() for d in dicts]
    df['hash'] = [hashlib.md5(str(x).encode('utf-8')).hexdigest() for x in dicts]
    df = df.drop_duplicates(subset='hash')
    with db.engine.connect() as conn:
        df.to_sql(
            'scrobbles',
            con=conn,
            chunksize=350,
            if_exists='append',
            method=sqlite_conflict_hash,
            index=False)
    return


"""
-------------------------- LAST.FM API ----------------------------
"""


def get_lastfm(payload, api_key):
    headers = {'user-agent': 'hex_lastfm_import/0.1; github.com/meisandrew'}
    url = 'http://ws.audioscrobbler.com/2.0/'

    payload['api_key'] = api_key
    payload['format'] = 'json'

    response = requests.get(url, headers=headers, params=payload)
    return response


def pull_lastfm_data(lastfm_username, api_key, most_recent_uts):
    responses = []

    page = 1
    total_pages = 1

    while page <= total_pages:
        payload = {
            'method': 'user.getRecentTracks',
            'limit': 200,
            'user': lastfm_username,
            'page': page,
            'from': most_recent_uts
        }

        # make the API call
        response = get_lastfm(payload, api_key)

        # if we get an error, print the response and halt the loop
        if response.status_code != 200:
            print(response.text)
            break

        # extract pagination info
        page = int(response.json()['recenttracks']['@attr']['page'])
        total_pages = int(response.json()['recenttracks']['@attr']['totalPages'])

        # append response
        responses.append(response)

        # sleep
        time.sleep(0.25)

        # increment the page number
        page += 1

    if total_pages <= 3:
        page = total_pages
        total_pages = 4
        while page <= total_pages:
            payload = {
                'method': 'user.getRecentTracks',
                'limit': 200,
                'user': lastfm_username,
                'page': page
            }

            # make the API call
            response = get_lastfm(payload, api_key)

            # if we get an error, print the response and halt the loop
            if response.status_code != 200:
                print(response.text)
                break

            # append response
            responses.append(response)

            # sleep
            time.sleep(0.25)

            # increment the page number
            page += 1

    frames = [pd.DataFrame(pd.json_normalize(r.json()['recenttracks']['track'])) for r in responses]
    df_lastfm_pull = pd.concat(frames).filter(['artist.#text', 'album.#text', 'date.uts', 'name'])
    df_lastfm_pull = df_lastfm_pull.rename(columns={'artist.#text': 'artist', 'album.#text': 'album', 'date.uts': 'played_at', 'name': 'track'})
    df_lastfm_pull = df_lastfm_pull.reset_index(drop=True)
    df_lastfm_pull = df_lastfm_pull.dropna()
    if df_lastfm_pull.empty:
        return pd.DataFrame([])
    else:
        try:
            df_lastfm_pull = df_lastfm_pull[['played_at', 'artist', 'album', 'track']]
        except KeyError:
            return pd.DataFrame([])
        else:
            return df_lastfm_pull
