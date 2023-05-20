import {
  Box,
  FormControl,
  Grid,
  FormLabel,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  SvgIcon,
  Autocomplete,
  TextField,
  Button,
  ListItem,
  Paper,
  LinearProgress,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ky from 'ky';
import React, { useState } from 'react';
import { FcCheckmark } from 'react-icons/all';
import useTitle from '../../hooks/useTitle';
import { MatchResponse, PlexTrack, Suggestion } from '../../ts/interfaces';

const radioStyle = {
  margin: 0,
  borderRadius: '4px',
  '&:hover': { backgroundColor: 'action.hover' },
};

const customRadio = (
  <Radio
    checkedIcon={<SvgIcon sx={{ opacity: 1 }}><FcCheckmark /></SvgIcon>}
    icon={<SvgIcon sx={{ opacity: 0 }}><FcCheckmark /></SvgIcon>}
    sx={{
      padding: '6px',
      '&:hover': {
        backgroundColor: 'transparent',
      },
    }}
  />
);

const normalize = (value: number, max: number) => ((value) * 100) / (max);

const Match = ({ title }: { title: string }) => {
  useTitle(title);
  const [totalUnreviewed, setTotalUnreviewed] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [input, setInput] = useState('');
  const [match, setMatch] = useState<Suggestion | PlexTrack | null>();
  const [selectValue, setSelectValue] = useState<PlexTrack | null>(null);
  const [value, setValue] = useState(0);
  const queryClient = useQueryClient();
  const { data: unreviewed, isLoading } = useQuery(
    ['unreviewed'],
    async () => await ky.get(
      '/api/get_next_unreviewed',
      { timeout: false },
    ).json() as MatchResponse,
    {
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        if (totalUnreviewed === 0) {
          setTotalUnreviewed(data.unreviewedCount);
        }
      },
    },
  );
  const { data: options } = useQuery(
    ['options', input],
    async () => await ky.get(
      '/api/query',
      {
        searchParams: {
          filter: input,
        },
        timeout: false,
      },
    ).json() as PlexTrack[],
    {
      initialData: [],
      enabled: input.length > 2,
      refetchOnWindowFocus: false,
    },
  );

  const handleMatchButton = () => {
    setDisabled(true);
    ky.post(
      '/api/handle_match',
      {
        body: JSON.stringify({
          concatLastfm: unreviewed?.scrobble.concatLastfm,
          plexId: match?.id,
        }),
        headers: { 'Content-type': 'application/json' },
        timeout: false,
      },
    )
      .then(() => queryClient.refetchQueries(['unreviewed']))
      .then(() => {
        setMatch(null);
        setValue(0);
        setSelectValue(null);
        setDisabled(false);
      });
  };

  const handleNoMatchButton = () => {
    setDisabled(true);
    ky.post(
      '/api/handle_no_match',
      {
        body: JSON.stringify({ concatLastfm: unreviewed?.scrobble.concatLastfm, plexId: 0 }),
        headers: { 'Content-type': 'application/json' },
        timeout: false,
      },
    )
      .then(() => queryClient.refetchQueries(['unreviewed']))
      .then(() => {
        setMatch(null);
        setValue(0);
        setSelectValue(null);
        setDisabled(false);
      });
  };

  const handleRadioSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(+event.target.value);
    const newMatch = unreviewed?.suggestions
      .find((suggestion) => suggestion.id.toString() === event.target.value);
    setMatch(newMatch);
  };

  const handleSearchInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSearchSelect = (_e: React.SyntheticEvent, newValue: PlexTrack | null) => {
    setValue(0);
    setSelectValue(newValue);
    setMatch(newValue);
  };

  if (isLoading) {
    return null;
  }

  if (unreviewed?.status === false) {
    return (
      <Box marginX={2}>
        <Grid container>
          <Grid item textAlign="center" xs={12}>
            <Typography variant="h6">
              No more scrobbles to match!
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box marginX={2}>
      <Grid container>
        <Grid item textAlign="center" xs={12}>
          <Typography variant="h6">
            {unreviewed?.scrobble.concatLastfm}
          </Typography>
          <span style={{ height: '4px' }} />
          <Typography variant="h6">
            {match?.concatPlex || '~'}
          </Typography>
        </Grid>
        <Grid item display="flex" justifyContent="center" mx="40px" xs={12}>
          <FormControl sx={{ width: 1 }}>
            <Box height="205px">
              <FormLabel>
                Suggested matches:
              </FormLabel>
              <RadioGroup value={value} onChange={handleRadioSelect}>
                {unreviewed?.suggestions.map((suggestion) => (
                  <FormControlLabel
                    control={customRadio}
                    key={suggestion.id}
                    label={(
                      <Typography mr="auto" mt="3px" pl="8px">{suggestion.concatPlex}</Typography>
                    )}
                    labelPlacement="start"
                    sx={radioStyle}
                    value={suggestion.id}
                  />
                ))}
              </RadioGroup>
            </Box>
            <FormLabel>
              Search:
            </FormLabel>
            <Autocomplete
              ListboxProps={{ style: { maxHeight: '250px' } }}
              PaperComponent={(props) => <Paper {...props} sx={{ backgroundColor: '#fafafa' }} />}
              filterOptions={(x) => x}
              getOptionLabel={(option) => option.concatPlex}
              options={options}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  onChange={handleSearchInput}
                />
              )}
              renderOption={(props, option) => (
                <ListItem {...props} key={option.ratingKey}>
                  {option.concatPlex}
                </ListItem>
              )}
              value={selectValue}
              onChange={handleSearchSelect}
            />
          </FormControl>
        </Grid>
        <Grid item display="flex" justifyContent="space-between" mt="8px" mx="40px" xs={12}>
          <Button
            color="error"
            disabled={disabled}
            sx={{ fontWeight: 700, textTransform: 'none' }}
            variant="contained"
            onClick={handleNoMatchButton}
          >
            No match!
          </Button>
          <Box
            display="flex"
            flexDirection="column"
            flexGrow={1}
            justifyContent="center"
            mt={1}
            mx={2}
          >
            <LinearProgress
              value={
                normalize(totalUnreviewed - (unreviewed?.unreviewedCount || 0), totalUnreviewed)
              }
              variant="determinate"
            />
            <Typography textAlign="center" variant="subtitle2">
              {`${unreviewed?.unreviewedCount} scrobbles remaining`}
            </Typography>
          </Box>
          <Button
            color="success"
            disabled={!match || disabled}
            sx={{ fontWeight: 700, textTransform: 'none' }}
            variant="contained"
            onClick={handleMatchButton}
          >
            Match
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Match;
