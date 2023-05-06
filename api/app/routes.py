import json
import numpy as np
import pandas as pd
import sqlalchemy
import sqlite3
import uuid
from app import app, db
from app.models import Account, AccountSchema, AddedTrack, Match, MatchSchema, Plex, PlexSchema, Scrobble, ScrobbleSchema
from datetime import datetime
from flask import jsonify, request, make_response
from fuzzywuzzy import process, fuzz
from sqlalchemy import select
from sqlalchemy.sql import and_, or_, asc, desc, func


@app.route("/")
def index():
    return app.send_static_file('index.html')


def jsonify_no_content():
    response = make_response('', 204)
    response.mimetype = 'application/json'
    return response


def create_device(database_path):
    name = 'hex-last.fm-import'
    identifier = uuid.uuid4()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    created_at, updated_at = now, now
    sql_insert = '''INSERT INTO devices (identifier, name, created_at, updated_at) VALUES (?, ?, ?, ?)'''
    sql_select = '''SELECT id from devices WHERE name=?'''
    with sqlite3.connect(database_path) as conn:
        c = conn.cursor()
        try:
            device_id = c.execute(sql_select, ([name])).fetchall()[0][0]
        except IndexError:
            c.execute(sql_insert, (str(identifier), name, created_at, updated_at))
            conn.commit()
            device_id = c.execute(sql_select, ([name])).fetchall()[0][0]
    return device_id


def populate_account_fields(account, form_data):
    account.lastfm_username = form_data.get('lastfmUsername')
    account.lastfm_api_key = form_data.get('lastfmApiKey')
    account.plex_account_id = form_data.get('plexAccountId')
    account.plex_db_file = form_data.get('plexDbFile')
    account.plex_music_library_id = form_data.get('plexMusicLibraryId')
    return


@app.route("/api/account_info", methods=['GET', 'POST'])
def account_info():
    schema = AccountSchema()
    account = db.session.query(Account).first()
    if request.method == 'GET' and account is None:
        return json.dumps({'account': {}})
    elif request.method == 'GET':
        return schema.dump(account)
    elif request.method == 'POST' and account is None:
        account = Account()
        populate_account_fields(account, request.form)
        account.plex_device_id = create_device(database_path=account.plex_db_file)
        db.session.add(account)
        db.session.commit()
        return schema.dump(account)
    elif request.method == 'POST':
        populate_account_fields(account, request.form)
        db.session.commit()
        return schema.dump(account)


def sqlite_conflict_hash(table, conn, keys, data_iter):
    from sqlalchemy.dialects.sqlite import insert

    data = [dict(zip(keys, row)) for row in data_iter]
    insert_stmt = insert(table.table).values(data)
    do_nothing_stmt = insert_stmt.on_conflict_do_nothing(
        index_elements=['hash']
    )
    conn.execute(do_nothing_stmt)


@app.route("/api/csv_upload", methods=['POST'])
def csv_upload():
    from app.functions import scrobble_dataframe_to_db, search_match
    csv = request.files['file']
    df = (pd.read_csv(csv.stream, encoding='utf8')
          .rename(columns={'uts': 'played_at'})
          .filter(['played_at', 'artist', 'album', 'track']))
    df['played_at'] = df['played_at'].map(str)
    scrobble_dataframe_to_db(df)
    unreviewed = db.session.query(Scrobble).filter(Scrobble.match_id == sqlalchemy.null()).all()
    for scrobble in unreviewed:
        search_match(scrobble)
    db.session.commit()
    return jsonify_no_content()


@app.route("/api/delete_new_track", methods=['POST'])
def delete_new_track():
    tracks = request.json
    for track_id in tracks:
      track = db.session.query(AddedTrack).filter(AddedTrack.id == track_id).one()
      db.session.delete(track)
      db.session.commit()
    return jsonify_no_content()


@app.route("/api/get_next_unreviewed", methods=['GET'])
def get_next_unreviewed():
    schema = ScrobbleSchema()
    next_unreviewed = db.session.query(Scrobble).filter(Scrobble.match_id == sqlalchemy.null()).first()
    if next_unreviewed is None:
        return jsonify(status=False)
    query = select(Plex)
    df = pd.read_sql(query, con=db.engine)
    suggestions = process.extract(next_unreviewed.concat_lastfm, df.concat_plex, scorer=fuzz.token_sort_ratio, limit=5)
    suggestions = [
        {'concatPlex': str(df.at[c, 'concat_plex']), 'id': int(df.at[c, 'id'])}
        for (a, b, c) in suggestions if b >= 60
    ]
    return jsonify(scrobble=schema.dump(next_unreviewed), status=True, suggestions=suggestions)


@app.route("/api/get_scrobble_date_range", methods=['GET'])
def get_scrobble_date_range():
    first_scrobble = db.session.query(func.min(Scrobble.played_at)).first()
    last_scrobble = db.session.query(func.max(Scrobble.played_at)).first()
    print(first_scrobble[0])
    return jsonify(
        start=first_scrobble[0],
        end=last_scrobble[0]
    )


@app.route("/api/handle_delete_matches", methods=['POST'])
def handle_delete_match():
    from app.functions import delete_single_plex_play
    matches = request.json
    for match_id in matches:
        match = db.session.query(Match).filter(Match.id == match_id).one()
        scrobbles = match.scrobbles.all()
        for scrobble in scrobbles:
            if scrobble.status == 'processed':
                delete_single_plex_play(scrobble)
            scrobble.match_id = None
            scrobble.status = None
        db.session.delete(match)
        db.session.commit()
    return jsonify_no_content()


@app.route("/api/handle_match", methods=['POST'])
def handle_match():
    match = Match(concat_lastfm=request.json['concatLastfm'], plex_id=request.json['plexId'])
    db.session.add(match)
    db.session.flush()
    scrobbles = db.session.query(Scrobble).filter(Scrobble.concat_lastfm == request.json['concatLastfm']).all()
    for scrobble in scrobbles:
        scrobble.match_id = match.id
        scrobble.status = 'matched'
    db.session.commit()
    return jsonify_no_content()


@app.route("/api/handle_no_match", methods=['POST'])
def handle_no_match():
    match = Match(concat_lastfm=request.json['concatLastfm'], plex_id=0)
    db.session.add(match)
    db.session.flush()
    scrobbles = db.session.query(Scrobble).filter(Scrobble.concat_lastfm == request.json['concatLastfm']).all()
    for scrobble in scrobbles:
        scrobble.match_id = match.id
        scrobble.status = 'unmatched'
    db.session.commit()
    return jsonify_no_content()


@app.route("/api/home_data", methods=['GET'])
def home_data():
    account = db.session.query(Account).first()
    if account is None:
        return jsonify(status="no account")
    scrobble_count = db.session.query(Scrobble).count()
    matched_count = (db.session.query(Scrobble)
                     .filter(or_(Scrobble.status == 'matched', Scrobble.status == 'processed'))
                     .count())
    unreviewed_count = db.session.query(Scrobble).filter(Scrobble.match_id == sqlalchemy.null()).count()
    plex_count = db.session.query(Plex).count()
    process_count = db.session.query(Scrobble).filter(Scrobble.status == 'matched').count()
    new_tracks_count = db.session.query(AddedTrack).count()
    return jsonify(
        lastHexUpdate=account.last_hex_update,
        scrobbleCount=scrobble_count,
        matchedCount=matched_count,
        unreviewedCount=unreviewed_count,
        plexCount=plex_count,
        processCount=process_count,
        newTracksCount=new_tracks_count
    )


@app.route("/api/inspect_matches", methods=['GET'])
def inspect_matches():
    schema = MatchSchema()
    start = request.args.get('start')
    end = request.args.get('end')
    if start:
        start = datetime.fromisoformat(start.replace('"', "").replace("Z", "+00:00")).timestamp()
    if end:
        end = datetime.fromisoformat(end.replace('"', "").replace("Z", "+00:00")).timestamp()
    active_col = request.args.get('activeCol', type=int)
    filter_str = request.args.get('filter', '', type=str).split()
    search_filter = ['%{}%'.format(x) for x in filter_str]
    order_by = request.args.get('order', type=str)
    page = request.args.get('page', 1, type=int)
    show = request.args.get('show', type=str)

    date_filter = True
    if start and not end:
        date_filter = and_(True, Scrobble.played_at >= start)
    elif end and not start:
        date_filter = and_(True, Scrobble.played_at <= end)
    elif start and end:
        date_filter = and_(True, Scrobble.played_at >= start, Scrobble.played_at <= end)

    match_filter = True
    if show == 'matched':
        match_filter = Match.plex_id != 0
    if show == 'unmatched':
        match_filter = Match.plex_id == 0

    query_filter = and_(True, *[Match.concat_lastfm.like(x) for x in search_filter], match_filter, date_filter)

    if active_col == 0:
        results = (db.session.query(Match, func.count(Scrobble.match_id))
                   .join(Scrobble)
                   .filter(query_filter)
                   .group_by(Match)
                   .paginate(page=page, per_page=20, error_out=False))

    if active_col == 1:
        if order_by == 'asc':
            results = (db.session.query(Match, func.count(Scrobble.match_id))
                       .join(Scrobble)
                       .filter(query_filter)
                       .group_by(Match)
                       .order_by(asc(Match.concat_lastfm))
                       .paginate(page=page, per_page=20, error_out=False))
        if order_by == 'desc':
            results = (db.session.query(Match, func.count(Scrobble.match_id))
                       .join(Scrobble)
                       .filter(query_filter)
                       .group_by(Match)
                       .order_by(desc(Match.concat_lastfm))
                       .paginate(page=page, per_page=20, error_out=False))

    if active_col == 2:
        if order_by == 'asc':
            results = (db.session.query(Match, func.count(Scrobble.match_id))
                       .join(Scrobble)
                       .join(Plex, isouter=True)
                       .filter(query_filter)
                       .group_by(Match)
                       .order_by(asc(Plex.concat_plex))
                       .paginate(page=page, per_page=20, error_out=False))
        if order_by == 'desc':
            results = (db.session.query(Match, func.count(Scrobble.match_id))
                       .join(Scrobble)
                       .join(Plex, isouter=True)
                       .filter(query_filter)
                       .group_by(Match)
                       .order_by(desc(Plex.concat_plex))
                       .paginate(page=page, per_page=20, error_out=False))

    if active_col == 3:
        if order_by == 'asc':
            results = (db.session.query(Match, func.count(Scrobble.match_id))
                       .join(Scrobble)
                       .filter(query_filter)
                       .group_by(Match)
                       .order_by(asc(func.count(Scrobble.match_id)))
                       .paginate(page=page, per_page=20, error_out=False))
        if order_by == 'desc':
            results = (db.session.query(Match, func.count(Scrobble.match_id))
                       .join(Scrobble)
                       .filter(query_filter)
                       .group_by(Match)
                       .order_by(desc(func.count(Scrobble.match_id)))
                       .paginate(page=page, per_page=20, error_out=False))
    matches = schema.dump([item[0] for item in results.items], many=True)
    for idx, row in enumerate(matches):
        row['playcount'] = results.items[idx][1]

    return jsonify(
        count=results.total,
        matches=matches,
        page=results.page
    )


@app.route("/api/new_tracks", methods=['GET'])
def new_tracks():
    new_tracks = db.session.query(AddedTrack, Plex).join(Plex, AddedTrack.rating_key == Plex.rating_key).all()
    new_tracks_count = db.session.query(AddedTrack).count()
    return jsonify(
        newTracks=[{'addedId': track[0].id, 'concatPlex': track[1].concat_plex} for track in new_tracks],
        newTracksCount=new_tracks_count
    )


@app.route("/api/process_matches", methods=['GET'])
def process_matches():
    from app.functions import add_scrobbles_to_plex, delete_plex_plays
    delete_plex_plays()
    add_scrobbles_to_plex()
    return jsonify_no_content()


@app.route("/api/query", methods=['GET'])
def query():
    schema = PlexSchema()
    search_filter_list = request.args.get('filter').split()
    search_filter_list = ['%{}%'.format(x) for x in search_filter_list]
    query_filter = and_(True, *[Plex.concat_plex.like(x) for x in search_filter_list])
    results = Plex.query.filter(query_filter).limit(30).all()
    return schema.dumps(results, many=True)


def sqlite_conflict_rating_key(table, conn, keys, data_iter):
    from sqlalchemy.dialects.sqlite import insert

    data = [dict(zip(keys, row)) for row in data_iter]
    insert_stmt = insert(table.table).values(data)
    upsert_stmt = insert_stmt.on_conflict_do_update(
        index_elements=['rating_key'],
        set_={c.key: c for c in insert_stmt.excluded if c.key != 'rating_key'}
    )
    conn.execute(upsert_stmt)
    return


@app.route("/api/update_hex_data")
def update_hex_data():
    from app.functions import get_plex_df, process_unmatch, delete_orphan_match_rows
    delete_orphan_match_rows()
    # Get dataframe of all Plex tracks in hex.fm database
    query = select(Plex)
    df_before = pd.read_sql(query, con=db.engine).drop(['id'], axis=1)
    # Get dataframe of all Plex tracks in Plex database
    df_plex = get_plex_df()
    # Update Plex tracks in hex.fm database where data is changed
    df_update = pd.concat([df_before, df_plex]).drop_duplicates(keep=False)
    df_update = df_update[df_update.duplicated(subset=['rating_key'], keep=False)]
    df_update = df_update.drop_duplicates(subset=['rating_key'], keep='last')
    for row in df_update.itertuples():
        rating_key = getattr(row, 'rating_key')
        grandparent_guid = getattr(row, 'grandparent_guid')
        parent_guid = getattr(row, 'parent_guid')
        guid = getattr(row, 'guid')
        process_unmatch(rating_key, guids=[grandparent_guid, parent_guid, guid])
    db.session.commit()
    with db.engine.connect() as conn:
        df_update.to_sql(
            'plex_tracks',
            con=conn,
            chunksize=190,
            if_exists='append',
            method=sqlite_conflict_rating_key,
            index=False)
    # Delete Plex tracks in hex.fm database that have been removed from the music server
    ar_old = np.array(df_before['rating_key'].tolist())
    ar_new = np.array(df_plex['rating_key'].tolist())
    ar_deleted = np.setdiff1d(ar_old, ar_new)
    for rating_key in ar_deleted:
        process_unmatch(rating_key, delete_track=True)
    db.session.commit()
    # Add new Plex tracks to hex.fm database
    ar_added = np.setdiff1d(ar_new, ar_old)
    df_added = df_plex[df_plex['rating_key'].isin(ar_added)]
    for rating_key in df_added['rating_key'].tolist():
        added = AddedTrack(rating_key=rating_key)
        db.session.add(added)
    db.session.commit()
    with db.engine.connect() as conn:
        df_added.to_sql(
            'plex_tracks',
            con=conn,
            chunksize=190,
            if_exists='append',
            method=sqlite_conflict_rating_key,
            index=False)
    account = db.session.query(Account).first()
    account.last_hex_update = datetime.utcnow()
    db.session.commit()
    return jsonify_no_content()


@app.route("/api/update_lastfm_data")
def update_lastfm_data():
    from app.functions import pull_lastfm_data, scrobble_dataframe_to_db, search_match
    account = db.session.query(Account).first()
    last_scrobble = db.session.query(func.max(Scrobble.played_at)).first()
    df = pull_lastfm_data(account.lastfm_username, account.lastfm_api_key, last_scrobble[0])
    scrobble_dataframe_to_db(df)
    unreviewed = db.session.query(Scrobble).filter(Scrobble.match_id == sqlalchemy.null()).all()
    for scrobble in unreviewed:
        search_match(scrobble)
    db.session.commit()
    return jsonify_no_content()
