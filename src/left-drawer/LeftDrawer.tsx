import { none, State, useHookstate } from '@hookstate/core';
import * as Mui from '@mui/material';
import * as Icons from '@mui/icons-material';
import { MAX_RCL, SETTINGS, STRUCTURE_CONTROLLER, TERRAIN_PLAIN } from '../utils/constants';
import { getRequiredRCL, getRoomPosition, getRoomTile, structureCanBePlaced } from '../utils/helpers';
import { RoomGridMap, RoomGridTerrain, RoomStructures, StructureBrush } from '../utils/types';
import LoadTerrain from './LoadTerrain';
import ExampleBunker from './ExampleBunker';

export const drawerWidth = 300;
const iconSize = '1.5rem';

const StyledButton = Mui.styled(Mui.Button)<Mui.ButtonProps>(({ theme, variant }) => ({
  borderColor: 'transparent !important',
  color: '#eee',
  textTransform: 'capitalize',
  ':hover': {
    backgroundColor: variant === 'contained' ? theme.palette.primary.main : 'rgba(255,255,255,0.15)',
  },
}));

const StyledAccordion = Mui.styled((props: Mui.AccordionProps) => (
  <Mui.Accordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&:before': {
    display: 'none',
  },
}));

const StyledAccordionSummary = Mui.styled((props: Mui.AccordionSummaryProps) => (
  <Mui.AccordionSummary expandIcon={<Icons.ArrowForwardIosSharp sx={{ fontSize: '0.9rem' }} />} {...props} />
))(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, .05)',
  flexDirection: 'row-reverse',
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(90deg)',
  },
  '& .MuiAccordionSummary-content': {
    marginLeft: theme.spacing(1),
  },
}));

const StyledAccordionDetails = Mui.styled(Mui.AccordionDetails)({
  padding: 0,
  borderTop: '1px solid rgba(0, 0, 0, .125)',
});

const StyledBadge = Mui.styled(Mui.Badge)<Mui.BadgeProps>(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: 18,
    top: 18,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: '0 4px',
  },
}));

export default function LeftDrawer(props: {
  roomGridState: State<RoomGridMap>;
  roomGridHoverState: State<number>;
  roomStructuresState: State<RoomStructures>;
  roomTerrainState: State<RoomGridTerrain>;
  settingsState: State<typeof SETTINGS>;
  structureBrushes: StructureBrush[];
}) {
  const hoverState = useHookstate(props.roomGridHoverState);
  const roomGridState = useHookstate(props.roomGridState);
  const roomStructuresState = useHookstate(props.roomStructuresState);
  const roomTerrainState = useHookstate(props.roomTerrainState);
  const settingsState = useHookstate(props.settingsState);
  const accordionRoomState = useHookstate(true);
  const accordionStructuresState = useHookstate(true);
  const accordionMapControlsState = useHookstate(true);
  const { bottomDrawerOpen, brush, rcl } = settingsState.get();
  const { x, y } = getRoomPosition(hoverState.get());
  const brushClass = 'brush';
  const controller = props.structureBrushes.find((b) => b.key === STRUCTURE_CONTROLLER);

  const getBrush = (target: HTMLElement): string => {
    if (target.classList.contains(brushClass)) {
      return (target as HTMLElement).dataset.structure!;
    }
    return getBrush(target.parentElement as HTMLElement);
  };

  const wipeStructures = () => {
    [roomGridState, roomStructuresState].forEach((s) => s.keys.forEach((k) => s.merge({ [k]: none })));
  };

  const wipeTerrain = () => {
    roomTerrainState.keys.forEach((k) => roomTerrainState.merge({ [k]: none }));
  };

  return (
    <Mui.Drawer
      variant='permanent'
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          overflow: 'hidden',
        },
      }}
    >
      <Mui.Toolbar variant='dense' />
      <Mui.Box sx={{ overflowY: 'auto' }}>
        <StyledAccordion expanded={accordionRoomState.get()} onChange={() => accordionRoomState.set((v) => !v)}>
          <StyledAccordionSummary>
            <Mui.Typography>Room</Mui.Typography>
          </StyledAccordionSummary>
          <StyledAccordionDetails>
            <Mui.Box display='flex' flexDirection='column' overflow='auto'>
              <Mui.Stack direction='column' sx={{ m: 2 }}>
                <Mui.Box alignItems='center' display='flex' flexDirection='row' justifyContent='space-between' mb={1}>
                  <Mui.Typography component='legend' variant='body2'>
                    Controller Level
                  </Mui.Typography>
                  <Mui.Box>
                    {controller && (
                      <StyledBadge badgeContent={rcl} color='secondary'>
                        <Mui.Avatar alt={controller.name} src={controller.image} sx={{ width: 36, height: 36 }} />
                      </StyledBadge>
                    )}
                  </Mui.Box>
                </Mui.Box>
                <Mui.ToggleButtonGroup
                  color='primary'
                  exclusive
                  fullWidth
                  onChange={(_, value) => value && settingsState.rcl.set(+value)}
                  size='small'
                  sx={{ mb: 2 }}
                  value={rcl}
                >
                  {Array.from(Array(MAX_RCL), (_, i) => ++i).map((level) => (
                    <Mui.ToggleButton key={level} value={level}>
                      {level}
                    </Mui.ToggleButton>
                  ))}
                </Mui.ToggleButtonGroup>
              </Mui.Stack>
            </Mui.Box>
          </StyledAccordionDetails>
        </StyledAccordion>
        <StyledAccordion
          expanded={accordionStructuresState.get()}
          onChange={() => accordionStructuresState.set((v) => !v)}
        >
          <StyledAccordionSummary>
            <Mui.Typography>Structures</Mui.Typography>
          </StyledAccordionSummary>
          <StyledAccordionDetails>
            <Mui.Box display='flex' flexDirection='column' overflow='auto'>
              <Mui.Stack direction='column' sx={{ m: 2 }}>
                {props.structureBrushes.map(({ key, image, total, name }) => {
                  const placed = roomStructuresState[key].get()?.length || 0;
                  const disabled = !structureCanBePlaced(key, rcl, placed, TERRAIN_PLAIN);
                  const error = total < placed;
                  const locked = !error && rcl < getRequiredRCL(key);
                  return (
                    <StyledButton
                      className={brushClass}
                      data-structure={key}
                      key={key}
                      disabled={disabled}
                      endIcon={
                        <Mui.Box
                          sx={{
                            backgroundImage: `url(${image})`,
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'contain',
                            height: iconSize,
                            width: iconSize,
                            opacity: disabled ? 0.2 : 1,
                          }}
                        />
                      }
                      onMouseDown={(e) => settingsState.nested('brush').set(getBrush(e.target as HTMLElement))}
                      sx={{
                        justifyContent: 'space-between',
                        '&& .MuiTouchRipple-rippleVisible': {
                          animationDuration: '200ms',
                        },
                      }}
                      variant={brush === key ? 'contained' : 'outlined'}
                    >
                      <Mui.Box
                        alignItems='center'
                        display='flex'
                        flexDirection='row'
                        justifyContent='space-between'
                        flexGrow='1'
                      >
                        <Mui.Typography variant='body2'>{name}</Mui.Typography>
                        <Mui.Tooltip title={`${total - placed} Remaining`}>
                          <Mui.Chip
                            color={error ? 'error' : 'default'}
                            icon={locked ? <Icons.Lock /> : <></>}
                            label={locked ? `RCL ${getRequiredRCL(key)}` : placed + ' / ' + total}
                            disabled={disabled}
                            size='small'
                            sx={{
                              ...(brush === key && !disabled && { borderColor: ({ palette }) => palette.text.primary }),
                              fontSize: '.7rem',
                              fontWeight: 300,
                            }}
                            variant='outlined'
                          />
                        </Mui.Tooltip>
                      </Mui.Box>
                    </StyledButton>
                  );
                })}
              </Mui.Stack>
            </Mui.Box>
          </StyledAccordionDetails>
        </StyledAccordion>
        <StyledAccordion
          expanded={accordionMapControlsState.get()}
          onChange={() => accordionMapControlsState.set((v) => !v)}
        >
          <StyledAccordionSummary>
            <Mui.Typography>Map Controls</Mui.Typography>
          </StyledAccordionSummary>
          <StyledAccordionDetails>
            <Mui.Box display='flex' flexDirection='column' overflow='auto'>
              <Mui.Stack direction='column' sx={{ m: 2 }}>
                <Mui.Button onMouseDown={wipeStructures} variant='text' endIcon={<Icons.FormatColorReset />}>
                  Wipe Structures
                </Mui.Button>
                <Mui.Button onMouseDown={wipeTerrain} variant='text' endIcon={<Icons.LayersClear />}>
                  Wipe Terrain
                </Mui.Button>
                <LoadTerrain
                  roomTerrainState={roomTerrainState}
                  settingsState={settingsState}
                  wipeTerrain={wipeTerrain}
                  wipeStructures={wipeStructures}
                />
                <ExampleBunker
                  roomGridState={roomGridState}
                  roomStructuresState={roomStructuresState}
                  roomTerrainState={roomTerrainState}
                  settingsState={settingsState}
                  wipeTerrain={wipeTerrain}
                  wipeStructures={wipeStructures}
                />
                {!bottomDrawerOpen && (
                  <Mui.Button
                    onMouseDown={() => settingsState.bottomDrawerOpen.set(true)}
                    variant='text'
                    endIcon={<Icons.DataObject />}
                  >
                    Generate JSON
                  </Mui.Button>
                )}
              </Mui.Stack>
            </Mui.Box>
          </StyledAccordionDetails>
        </StyledAccordion>
      </Mui.Box>
    </Mui.Drawer>
  );
}
