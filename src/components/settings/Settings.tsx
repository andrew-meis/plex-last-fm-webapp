import { LoadingButton } from '@mui/lab';
import {
  Box, Divider, Grid, IconButton, Input, SvgIcon, TextField, Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ky from 'ky';
import React, { useRef, useState } from 'react';
import { BiEdit, BiSave } from 'react-icons/all';
import useTitle from '../../hooks/useTitle';
import { Account } from '../../ts/interfaces';

const Settings = ({ title }: { title: string }) => {
  useTitle(title);
  const [isDisabled, setDisabled] = useState(true);
  const [isLoading, setLoading] = useState(false);
  const { data: accountInfo } = useQuery(
    ['settings'],
    async () => await ky.get('/api/account_info', { timeout: false }).json() as Account,
    {
      refetchOnWindowFocus: false,
    },
  );
  const queryClient = useQueryClient();
  const lastfmUsernameRef = useRef<HTMLFormElement>(null);
  const lastfmApiKeyRef = useRef<HTMLFormElement>(null);
  const plexDbFileRef = useRef<HTMLFormElement>(null);
  const plexAccountIdRef = useRef<HTMLFormElement>(null);
  const plexMusicLibraryIdRef = useRef<HTMLFormElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const data = new FormData();
    if (event.target.files) {
      data.append('file', event?.target?.files[0]);
    }
    ky.post(
      '/api/csv_upload',
      {
        body: data,
        timeout: false,
      },
    ).then(() => setLoading(false));
  };

  const handleSave = () => {
    const data = new FormData();
    data.append('lastfmUsername', lastfmUsernameRef?.current?.value);
    data.append('lastfmApiKey', lastfmApiKeyRef?.current?.value);
    data.append('plexDbFile', plexDbFileRef?.current?.value);
    data.append('plexAccountId', plexAccountIdRef?.current?.value);
    data.append('plexMusicLibraryId', plexMusicLibraryIdRef?.current?.value);
    ky.post(
      '/api/account_info',
      {
        body: data,
        timeout: false,
      },
    ).then(() => {
      queryClient.refetchQueries(['settings']).then(() => setDisabled(true));
    });
  };

  if (!accountInfo) {
    return null;
  }

  return (
    <Box marginX={2} position="relative" top={-54}>
      <Grid container>
        <Grid item alignItems="center" display="flex" xs={12}>
          {isDisabled
          && (
            <IconButton sx={{ ml: 'auto' }} onClick={() => setDisabled(false)}>
              <SvgIcon>
                <BiEdit />
              </SvgIcon>
            </IconButton>
          )}
          {!isDisabled
          && (
            <IconButton sx={{ ml: 'auto' }} onClick={handleSave}>
              <SvgIcon>
                <BiSave />
              </SvgIcon>
            </IconButton>
          )}
        </Grid>
      </Grid>
      <Divider sx={{ my: '8px' }} />
      <Typography variant="h6">
        last.fm
      </Typography>
      <Grid container mb="8px" mt="-8px" spacing={2}>
        <Grid item xs={4}>
          <TextField
            fullWidth
            defaultValue={accountInfo.lastfmUsername}
            disabled={isDisabled}
            id="last-fm-username"
            inputRef={lastfmUsernameRef}
            label="Username"
            variant="standard"
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            defaultValue={accountInfo.lastfmApiKey}
            disabled={isDisabled}
            id="last-fm-api-key"
            inputRef={lastfmApiKeyRef}
            label="API key"
            variant="standard"
          />
        </Grid>
      </Grid>
      <br />
      <Typography variant="h6">
        Plex
      </Typography>
      <Grid container mb="8px" mt="-8px" spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            defaultValue={accountInfo.plexDbFile}
            disabled={isDisabled}
            id="plex-database"
            inputRef={plexDbFileRef}
            label="Plex database location"
            variant="standard"
          />
        </Grid>
        <Grid item xs={3}>
          <TextField
            fullWidth
            defaultValue={accountInfo.plexAccountId}
            disabled={isDisabled}
            id="account-id"
            inputRef={plexAccountIdRef}
            label="Plex account ID"
            variant="standard"
          />
        </Grid>
        <Grid item xs={3}>
          <TextField
            fullWidth
            defaultValue={accountInfo.plexMusicLibraryId}
            disabled={isDisabled}
            id="library-section-id"
            inputRef={plexMusicLibraryIdRef}
            label="Music section ID"
            variant="standard"
          />
        </Grid>
      </Grid>
      <br />
      <Typography variant="h6">
        CSV upload
      </Typography>
      <Grid container mb="8px" mt="-8px" spacing={2}>
        <Grid item alignItems="center" display="flex" xs={10}>
          <Typography variant="subtitle2">
            Upload an untouched .csv file from this
            last.fm data export tool: https://mainstream.ghan.nl/export.html
          </Typography>
        </Grid>
        <Grid item component="form" display="flex" justifyContent="flex-end" xs={2}>
          <label htmlFor="csv-upload">
            <Input
              id="csv-upload"
              inputProps={{ accept: '.csv' }}
              sx={{ display: 'none' }}
              type="file"
              onChange={handleFileUpload}
            />
            <LoadingButton
              component="span"
              loading={isLoading}
              sx={{ fontWeight: 700, textTransform: 'none' }}
              variant="contained"
            >
              Choose file
            </LoadingButton>
          </label>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
