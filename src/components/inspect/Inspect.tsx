import {
  Alert,
  Box,
  Checkbox,
  Grid,
  IconButton,
  Paper,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ky from 'ky';
import moment, { Moment } from 'moment';
import React, { useState } from 'react';
import { MdDelete } from 'react-icons/all';
import { useDebounce } from 'react-use';
import useTitle from '../../hooks/useTitle';
import { InspectResponse, ScrobbleDateRange } from '../../ts/interfaces';
import Header from './Header';
import NewTracks from './NewTracks';

const Inspect = ({ title }: { title: string }) => {
  useTitle(title);
  const [activeCol, setActiveCol] = useState<number>(0);
  const [filter, setFilter] = useState<string>('');
  const [filterDebounced, setFilterDebounced] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(0);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [show, setShow] = useState<string>('all');
  const [start, setStart] = useState<Moment>(moment.unix(0));
  const [end, setEnd] = useState<Moment>(moment.unix(0));
  const queryClient = useQueryClient();
  const { data } = useQuery(
    ['scrobble-date-range'],
    async () => await ky.get(
      '/api/get_scrobble_date_range',
      {
        timeout: false,
      },
    ).json() as ScrobbleDateRange,
    {
      refetchOnWindowFocus: false,
      onSuccess: (newData) => {
        setStart(moment.unix(newData.start));
        setEnd(moment.unix(newData.end));
      },
    },
  );
  const { data: inspectData } = useQuery(
    ['matches', activeCol, filterDebounced, order, page, show, start, end],
    async () => await ky.get(
      '/api/inspect_matches',
      {
        searchParams: {
          activeCol: activeCol as unknown as string,
          filter: filterDebounced,
          order,
          page: page as unknown as string,
          show,
          ...(start.unix() !== data?.start && { start: start.toISOString() }),
          ...(end.unix() !== data?.end && { end: end.toISOString() }),
        },
        timeout: false,
      },
    ).json() as InspectResponse,
    {
      enabled: (start.unix() !== 0 || end.unix() !== 0)
        && (filterDebounced.length === 0 || filterDebounced.length > 2),
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    },
  );

  useDebounce(() => {
    setFilterDebounced(filter);
  }, 300, [filter]);

  const handleChipClick = (type: string) => {
    if (type === 'all' && show !== 'all') {
      setShow('all');
    }
    if (type === 'matched' && show !== 'matched') {
      setShow('matched');
    }
    if (type === 'matched' && show === 'matched') {
      setShow('all');
    }
    if (type === 'unmatched' && show !== 'unmatched') {
      setShow('unmatched');
    }
    if (type === 'unmatched' && show === 'unmatched') {
      setShow('all');
    }
  };

  const handleClick = (_event: React.MouseEvent<unknown>, id: number) => {
    let newSelected: readonly number[] = [];

    if (selected.includes(id)) {
      newSelected = selected.filter((n) => n !== id);
    } else {
      newSelected = [...selected, id];
    }

    setSelected(newSelected);
  };

  const handleSort = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>, colId: number) => {
    event.currentTarget.blur();
    if (colId !== activeCol) {
      setActiveCol(colId);
      setOrder(colId === 3 ? 'desc' : 'asc');
    }
    if (colId === activeCol && order === 'asc') {
      setOrder('desc');
    }
    if (colId === activeCol && order === 'desc') {
      setActiveCol(0);
      setOrder('asc');
    }
  };

  const handleDeleteMatches = () => {
    ky.post(
      '/api/handle_delete_matches',
      {
        body: JSON.stringify(selected),
        headers: { 'Content-type': 'application/json' },
        timeout: false,
      },
    ).then(() => {
      setSelected([]);
      queryClient
        .refetchQueries(['matches', activeCol, filterDebounced, order, page, show, start, end]);
    });
  };

  const handlePageChange = (_e: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage + 1);
  };

  if (!inspectData) {
    return null;
  }

  return (
    <Box marginX={2}>
      <Grid container>
        <NewTracks />
        <Header
          end={end}
          filter={filter}
          handleChipClick={handleChipClick}
          setEnd={setEnd}
          setFilter={setFilter}
          setStart={setStart}
          show={show}
          start={start}
        />
        <Grid item xs={12}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small" sx={{ borderCollapse: 'separate', marginBottom: 2 }} width="100%">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      disabled
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ width: 'calc(50% - 40px)', p: 1 }}>
                    <TableSortLabel
                      active={activeCol === 1}
                      direction={order}
                      onClick={(event) => handleSort(event, 1)}
                    >
                      <b>Last.fm Scrobble</b>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ width: 'calc(50% - 40px)', p: 1 }}>
                    <TableSortLabel
                      active={activeCol === 2}
                      direction={order}
                      onClick={(event) => handleSort(event, 2)}
                    >
                      <b>Plex Library Match</b>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ width: '40px', p: 1 }}>
                    <TableSortLabel
                      active={activeCol === 3}
                      direction={order}
                      onClick={(event) => handleSort(event, 3)}
                    >
                      <b>Plays</b>
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inspectData.matches.map((row, index) => (
                  <TableRow
                    hover
                    key={row.id}
                    onClick={(e) => handleClick(e, row.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(row.id)}
                        color="primary"
                        inputProps={{
                          'aria-labelledby': `table-checkbox-${index}`,
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.concatLastfm}
                      width="50%"
                    >
                      {row.concatLastfm}
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.plexTrack ? row.plexTrack.concatPlex : 'No match!'}
                      width="50%"
                    >
                      {row.plexTrack ? row.plexTrack.concatPlex : 'No match!'}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ minWidth: '40px', p: 1 }}
                      title={`Total: ${row.scrobbles.length}`}
                    >
                      {row.playcount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    showFirstButton
                    showLastButton
                    count={inspectData.count}
                    page={inspectData.page - 1}
                    rowsPerPage={20}
                    rowsPerPageOptions={[20]}
                    onPageChange={handlePageChange}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
      <Alert
        action={(
          <Tooltip arrow title="Remove Matches">
            <IconButton
              color="primary"
              disabled={selected.length === 0}
              sx={{ height: 30, width: 30 }}
              onClick={handleDeleteMatches}
            >
              <SvgIcon>
                <MdDelete />
              </SvgIcon>
            </IconButton>
          </Tooltip>
        )}
        severity="info"
        sx={{
          mb: 2,
          '& .MuiAlert-action': {
            padding: '3px 0 0 16px',
          },
        }}
      >
        {`${selected.length} selected`}
      </Alert>
    </Box>
  );
};

export default Inspect;
