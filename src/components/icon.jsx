import {
  ArrowBendUpRightIcon, ArrowClockwiseIcon, ArrowLeftIcon, ArrowSquareOutIcon,
  CaretDoubleUpIcon, CaretDownIcon, CaretRightIcon, CaretUpIcon, CheckIcon, ClockIcon, ClockCounterClockwiseIcon,
  CompassIcon, CopyIcon, DotsThreeIcon, FastForwardIcon, FileTextIcon, FlameIcon, GearSixIcon, HardDriveIcon, InfoIcon, KeyIcon,
  ListIcon, ListChecksIcon, MagnifyingGlassIcon, MonitorIcon, MoonIcon, PauseIcon, PencilSimpleIcon, PlayIcon, PlusIcon,
  PlusCircleIcon, PulseIcon, QueueIcon, SignOutIcon, SkipForwardIcon, SlidersHorizontalIcon, SlidersIcon, SunIcon, TimerIcon,
  TrashIcon, TrashSimpleIcon, WarningIcon, WarningCircleIcon, XIcon,
} from '@phosphor-icons/react';

const icons = {
  monitor: MonitorIcon,
  sun: SunIcon,
  moon: MoonIcon,
  menu: ListIcon,
  search: MagnifyingGlassIcon,
  server: HardDriveIcon,
  tube: QueueIcon,
  settings: GearSixIcon,
  advancedSettings: SlidersHorizontalIcon,
  caretDown: CaretDownIcon,
  caretRight: CaretRightIcon,
  signOut: SignOutIcon,
  externalLink: ArrowSquareOutIcon,
  refresh: ArrowClockwiseIcon,
  scrollUp: CaretUpIcon,
  edit: PencilSimpleIcon,
  pause: PauseIcon,
  play: PlayIcon,
  fastForward: FastForwardIcon,
  skipForward: SkipForwardIcon,
  more: DotsThreeIcon,
  key: KeyIcon,
  priority: CaretDoubleUpIcon,
  history: ClockCounterClockwiseIcon,
  file: FileTextIcon,
  restart: ArrowClockwiseIcon,
  pulse: PulseIcon,
  release: ArrowBendUpRightIcon,
  flame: FlameIcon,
  clock: ClockIcon,
  timer: TimerIcon,
  compass: CompassIcon,
  jobData: SlidersIcon,
  add: PlusIcon,
  copy: CopyIcon,
  addCircle: PlusCircleIcon,
  listChecks: ListChecksIcon,
  trash: TrashIcon,
  trashSimple: TrashSimpleIcon,
  back: ArrowLeftIcon,
  check: CheckIcon,
  info: InfoIcon,
  error: WarningCircleIcon,
  warning: WarningIcon,
  close: XIcon,
};

export function Icon({ name, className, weight = 'bold' }) {
  const Glyph = icons[name];
  return <Glyph
    className={className ? 'console-icon ' + className : 'console-icon'}
    size="1em"
    weight={weight}
    aria-hidden="true"
  />;
}
