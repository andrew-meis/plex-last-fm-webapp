import { Grid, Chip, TextFieldProps, TextField, SvgIcon } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import React from 'react';
import { FcEmptyFilter } from 'react-icons/all';

interface HeaderProps {
  end: Date | null;
  filter: string;
  handleChipClick: (type: string) => void;
  handleEndChange: (newValue: Date | null) => void;
  handleStartChange: (newValue: Date | null) => void;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
  show: string;
  start: Date | null;
}

const Header = ({
  end,
  filter,
  handleChipClick,
  handleEndChange,
  handleStartChange,
  setFilter,
  show,
  start,
}: HeaderProps) => (
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
    <DatePicker
      disableFuture
      label="Start date"
      maxDate={end || undefined}
      slots={{
        textField: (props: TextFieldProps) => (
          <TextField
            {...props}
            size="small"
            sx={{ width: '20ch', mr: '16px' }}
            variant="standard"
          />
        ),
      }}
      value={start}
      onChange={handleStartChange}
    />
    <DatePicker
      disableFuture
      label="End date"
      minDate={start || undefined}
      slots={{
        textField: (props: TextFieldProps) => (
          <TextField
            {...props}
            size="small"
            sx={{ width: '20ch', mr: '16px' }}
            variant="standard"
          />
        ),
      }}
      value={end}
      onChange={handleEndChange}
    />
    <TextField
      InputProps={{
        endAdornment: (
          <SvgIcon sx={{ width: '0.9em', height: '0.9em' }}><FcEmptyFilter /></SvgIcon>
        ),
      }}
      label="Filter scrobbles"
      size="small"
      value={filter}
      variant="standard"
      onChange={(event) => setFilter(event.target.value)}
    />
  </Grid>
);

export default Header;
