import { LoadingButton } from '@mui/lab';
import {
  Alert,
  Box,
  Grid,
  NativeSelect,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ky from 'ky';
import { useState } from 'react';
import { BiLink, GrLastfm, MdOutlineVisibilityOff, SiPlex } from 'react-icons/all';
import useTitle from '../../hooks/useTitle';
import { HomeData } from '../../ts/interfaces';
import InfoCard from './InfoCard';

const Dashboard = ({ title }: { title: string }) => {
  useTitle(title);
  const [days, setDays] = useState(30);
  const [isProcessing, setProcessing] = useState(false);
  const [isUpdating, setUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    ['home', days],
    async () => await ky.get(
      '/api/home_data',
      {
        timeout: false,
        searchParams: {
          days,
        },
      },
    ).json() as HomeData,
    {
      keepPreviousData: true,
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

  if (isLoading || !data) {
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
      {data.newTracksCount > 0 && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
          }}
        >
          {`${data.newTracksCount} new tracks in your Plex library.
          Remove prior matches for these tracks in the Inspect tab.`}
        </Alert>
      )}
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
        <Grid item display="flex" justifyContent="space-between" xs={12}>
          <Typography ml={0.5} variant="h6">
            Top Unmatched Tracks
          </Typography>
          <NativeSelect
            defaultValue={days}
            sx={{
              width: '16ch',
            }}
            onChange={(e) => setDays(e.target.value as unknown as number)}
          >
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
            <option value={365}>Last 365 days</option>
          </NativeSelect>
        </Grid>
        <Grid item xs={12}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small" sx={{ borderCollapse: 'separate', marginBottom: 2 }} width="100%">
              <TableHead>
                <TableRow>
                  <TableCell
                    align="center"
                    sx={{ minWidth: '20px', p: 1 }}
                  >
                    <b>#</b>
                  </TableCell>
                  <TableCell align="center" sx={{ width: 'calc(100% - 60px)', p: 1 }}>
                    <b>Last.fm Scrobble</b>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ minWidth: '40px', p: 1 }}
                  >
                    <b>Plays</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topUnmatched.map((unmatched, index) => (
                  <TableRow
                    hover
                    key={unmatched.id}
                  >
                    <TableCell
                      align="center"
                      sx={{ minWidth: '20px', p: 1 }}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell sx={{ width: 'calc(100% - 60px)', p: 1 }}>
                      {unmatched.concatLastfm}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ minWidth: '40px', p: 1 }}
                    >
                      {unmatched.playcount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
