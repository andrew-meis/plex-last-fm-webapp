import { LoadingButton } from '@mui/lab';
import { Box, Grid, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ky from 'ky';
import { useState } from 'react';
import { BiLink, GrLastfm, MdOutlineVisibilityOff, SiPlex } from 'react-icons/all';
import useTitle from '../../hooks/useTitle';
import { HomeData } from '../../ts/interfaces';
import InfoCard from './InfoCard';

const Dashboard = ({ title }: { title: string }) => {
  useTitle(title);
  const [isProcessing, setProcessing] = useState(false);
  const [isUpdating, setUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    ['home'],
    async () => await ky.get('/api/home_data', { timeout: false }).json() as HomeData,
    {
      refetchOnWindowFocus: false,
    },
  );

  const handleHexUpdate = () => {
    setUpdating(true);
    ky.get('/api/update_hex_data', { timeout: false })
      .then(() => ky.get('/api/update_lastfm_data', { timeout: false }))
      .then(() => queryClient.refetchQueries(['home']))
      .then(() => setUpdating(false));
  };

  const handleProcessMatches = () => {
    setProcessing(true);
    ky.get('/api/process_matches', { timeout: false })
      .then(() => queryClient.refetchQueries(['home']))
      .then(() => setProcessing(false));
  };

  const formatDate = (dateStr: string) => {
    const date: Date = new Date(Date.parse(dateStr));
    return {
      date: date.toLocaleString('en-gb', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('en-us'),
    };
  };

  if (isLoading) {
    return null;
  }

  if (!data) {
    return null;
  }

  if (data?.status === 'no account') {
    return (
      <Box marginX="20px">
        <Grid container>
          <Grid item xs={12}>
            <Typography variant="h5">
              Go to Settings and enter your Plex details to get started.
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box marginX={2}>
      <Grid container>
        <Grid item xs={12}>
          <Typography ml={0.5} variant="h6">
            Overview
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <InfoCard
            color="orchid"
            count={data.scrobbleCount}
            icon={<GrLastfm />}
            text="Total scrobbles"
          />
        </Grid>
        <Grid item xs={3}>
          <InfoCard
            color="lightcoral"
            count={data.matchedCount}
            icon={<BiLink />}
            text="Matched scrobbles"
          />
        </Grid>
        <Grid item xs={3}>
          <InfoCard
            color="lightseagreen"
            count={data.unreviewedCount}
            icon={<MdOutlineVisibilityOff />}
            text="Unreviewed scrobbles"
          />
        </Grid>
        <Grid item xs={3}>
          <InfoCard
            color="cornflowerblue"
            count={data.plexCount}
            icon={<SiPlex />}
            text="Total Plex tracks"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography ml={0.5} variant="h6">
            Actions
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Box
            display="flex"
            flexDirection="column"
            height="136px"
            justifyContent="space-between"
            padding={4}
            sx={{ backgroundColor: '#fafafa', m: '4px', borderRadius: '4px' }}
          >
            <Typography textAlign="center">
              Retrieve the latest information about your Plex music library
              and fetch new scrobbles from last.fm.
            </Typography>
            <span style={{ height: '4px', width: '100%', flexGrow: 1 }} />
            <LoadingButton
              loading={isUpdating}
              loadingIndicator="Updating..."
              sx={{ fontWeight: 700, textTransform: 'none', mr: '4px' }}
              variant="outlined"
              onClick={handleHexUpdate}
            >
              Update hex.fm
            </LoadingButton>
            <span style={{ height: '4px', width: '100%' }} />
            <Typography textAlign="center" variant="caption">
              Last updated:&nbsp;
              {formatDate(data.lastHexUpdate).date}
              &nbsp;
              {formatDate(data.lastHexUpdate).time}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box
            display="flex"
            flexDirection="column"
            height="136px"
            justifyContent="space-between"
            padding={4}
            sx={{ backgroundColor: '#fafafa', m: '4px', borderRadius: '4px' }}
          >
            <Typography textAlign="center">
              Push updated playcount information to the Plex database.
            </Typography>
            <span style={{ height: '4px', width: '100%', flexGrow: 1 }} />
            <LoadingButton
              loading={isProcessing}
              loadingIndicator="Processing..."
              sx={{ fontWeight: 700, textTransform: 'none', mr: '4px' }}
              variant="outlined"
              onClick={handleProcessMatches}
            >
              Process matches
            </LoadingButton>
            <span style={{ height: '4px', width: '100%' }} />
            <Typography textAlign="center" variant="caption">
              Scrobbles to process:&nbsp;
              { data.processCount }
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
