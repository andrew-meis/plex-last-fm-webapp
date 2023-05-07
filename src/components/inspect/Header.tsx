import {
  Box, Grid, Chip, TextField, SvgIcon, Typography, Button,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import moment, { Moment } from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { FiFilter } from 'react-icons/all';

interface HeaderProps {
  end: Moment | null;
  filter: string;
  handleChipClick: (type: string) => void;
  setEnd: React.Dispatch<React.SetStateAction<Moment>>;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
  setStart: React.Dispatch<React.SetStateAction<Moment>>;
  show: string;
  start: Moment | null;
}

const Header = ({
  end,
  filter,
  handleChipClick,
  setEnd,
  setFilter,
  setStart,
  show,
  start,
}: HeaderProps) => {
  const queryClient = useQueryClient();
  const endInputRef = useRef<HTMLInputElement>();
  const startInputRef = useRef<HTMLInputElement>();
  const [endInput, setEndInput] = useState(end);
  const [startInput, setStartInput] = useState(start);
  const [error, setError] = useState(false);

  useEffect(() => {
    setStartInput(start);
    setEndInput(end);
  }, [start, end]);

  const handleSetDates = (event: React.FormEvent) => {
    event.preventDefault();
    if (!startInput || !endInput) {
      return;
    }
    startInputRef.current?.blur();
    endInputRef.current?.blur();
    const newStart = startInput.hour(0).minute(0).second(0);
    const newEnd = endInput.hour(23).minute(59).second(59);
    if (newStart.isBefore(newEnd)) {
      setStart(newStart);
      setEnd(newEnd);
      setError(false);
      return;
    }
    setError(true);
  };

  return (
    <Grid item alignItems="center" display="flex" xs={12}>
      <Chip
        color="primary"
        label="All"
        sx={{ mr: '8px' }}
        variant={show === 'all' ? 'filled' : 'outlined'}
        onClick={() => handleChipClick('all')}
      />
      <Chip
        color="primary"
        label="Matched"
        sx={{ mr: '8px' }}
        variant={show === 'matched' ? 'filled' : 'outlined'}
        onClick={() => handleChipClick('matched')}
      />
      <Chip
        color="primary"
        label="Unmatched"
        variant={show === 'unmatched' ? 'filled' : 'outlined'}
        onClick={() => handleChipClick('unmatched')}
      />
      <span style={{ flexGrow: 1 }} />
      <Box
        alignItems="center"
        component="form"
        display="flex"
        ml={0.5}
        onSubmit={handleSetDates}
      >
        <Typography fontWeight={700} variant="subtitle2">
          Start:&nbsp;
        </Typography>
        <TextField
          error={error}
          inputRef={startInputRef}
          sx={{ width: '16ch' }}
          type="date"
          value={startInput?.toISOString(true).split('T')[0] || ''}
          variant="standard"
          onChange={(e) => {
            const date = moment(e.target.value);
            if (!date.isValid()) {
              return;
            }
            setStartInput(date);
          }}
        />
        &nbsp;&nbsp;&nbsp;
        <Typography fontWeight={700} variant="subtitle2">
          End:&nbsp;
        </Typography>
        <TextField
          inputRef={endInputRef}
          sx={{ width: '16ch' }}
          type="date"
          value={endInput?.toISOString(true).split('T')[0] || ''}
          variant="standard"
          onChange={(e) => {
            const date = moment(e.target.value);
            if (!date.isValid()) {
              return;
            }
            setEndInput(date);
          }}
        />
        <Button
          size="small"
          sx={{ fontWeight: 700, maxHeight: 30, ml: 1, textTransform: 'none' }}
          type="submit"
          variant="outlined"
        >
          Apply
        </Button>
        <Button
          color="error"
          size="small"
          sx={{ fontWeight: 700, maxHeight: 30, ml: 1, textTransform: 'none' }}
          variant="outlined"
          onClick={() => queryClient.refetchQueries(['scrobble-date-range'])}
        >
          Reset
        </Button>
      </Box>
      <span style={{ flexGrow: 1 }} />
      <TextField
        InputProps={{
          endAdornment: (
            <SvgIcon color="primary" sx={{ width: '0.9em', height: '0.9em' }}><FiFilter /></SvgIcon>
          ),
        }}
        placeholder="Filter scrobbles..."
        size="small"
        sx={{ ml: 1 }}
        value={filter}
        variant="standard"
        onChange={(event) => setFilter(event.target.value)}
      />
    </Grid>
  );
};

export default Header;
