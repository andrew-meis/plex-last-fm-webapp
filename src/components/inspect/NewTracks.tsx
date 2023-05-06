import {
  Grid, Typography, Box, List, ListItem, ListItemText, Checkbox, Button,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ky from 'ky';
import React, { useState } from 'react';
import { NewTracksData } from '../../ts/interfaces';

const NewTracks = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<readonly number[]>([]);
  const { data, isLoading } = useQuery(
    ['new-tracks'],
    async () => await ky.get('/api/new_tracks', { timeout: false }).json() as NewTracksData,
    {
      refetchOnWindowFocus: false,
    },
  );

  const handleClick = (_event: React.MouseEvent<unknown>, id: number) => {
    let newSelected: readonly number[] = [];

    if (selected.includes(id)) {
      newSelected = selected.filter((n) => n !== id);
    } else {
      newSelected = [...selected, id];
    }

    setSelected(newSelected);
  };

  const handleDeleteNewTrack = () => {
    ky.post(
      '/api/delete_new_track',
      {
        body: JSON.stringify(selected),
        headers: { 'Content-type': 'application/json' },
        timeout: false,
      },
    ).then(() => queryClient.refetchQueries(['new-tracks']));
  };

  if (!data?.newTracks || isLoading) {
    return null;
  }

  return (
    <Grid item mb={2} xs={12}>
      <Box display="flex" py={1} width={1}>
        <Typography ml={0.5} variant="h6">
          Recently Added Tracks
        </Typography>
        {selected.length > 0 && (
          <Button
            color="success"
            size="small"
            sx={{ fontWeight: 700, ml: 'auto', mr: 2, textTransform: 'none' }}
            variant="outlined"
            onClick={handleDeleteNewTrack}
          >
            Confirm
          </Button>
        )}
      </Box>
      <Grid item xs={12}>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
          padding={3}
          sx={{ backgroundColor: '#fafafa', m: '4px', borderRadius: '4px' }}
        >
          <Typography textAlign="center">
            There are
            <b>{` ${data.newTracksCount} `}</b>
            new tracks in your Plex library.
            {data.newTracksCount > 0 && (
              <>
                Confirm that any previous matches for these tracks are manually removed.
              </>
            )}
          </Typography>
          <List dense sx={{ maxHeight: 36 * 6, overflow: 'scroll' }}>
            {data.newTracks.map((track) => (
              <ListItem
                key={track.addedId}
                secondaryAction={(
                  <Checkbox
                    checked={selected.includes(track.addedId)}
                  />
                )}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={(e) => handleClick(e, track.addedId)}
              >
                <ListItemText>
                  {track.concatPlex}
                </ListItemText>
              </ListItem>
            ))}
          </List>
        </Box>
      </Grid>
    </Grid>
  );
};

export default NewTracks;
