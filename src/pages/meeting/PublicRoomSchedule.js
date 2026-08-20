import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, CardBody, Spinner } from 'reactstrap';

const DEFAULT_ROOMS = [
  {
    name: 'Growth',
    emoji: '📈',
    accent: '#1d4ed8',
    surface: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    titleColor: '#0f172a',
    mutedColor: '#334155',
    countBackground: 'rgba(15, 23, 42, 0.08)',
    countColor: '#0f172a',
    iconBackground: 'rgba(30, 64, 175, 0.14)',
    iconColor: '#1d4ed8',
  },
  {
    name: 'Harmoni',
    emoji: '🎵',
    accent: '#047857',
    surface: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    titleColor: '#0f172a',
    mutedColor: '#334155',
    countBackground: 'rgba(15, 23, 42, 0.08)',
    countColor: '#0f172a',
    iconBackground: 'rgba(4, 120, 87, 0.14)',
    iconColor: '#047857',
  },
  {
    name: 'Kopiah',
    emoji: '🧢',
    accent: '#b45309',
    surface: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    titleColor: '#0f172a',
    mutedColor: '#334155',
    countBackground: 'rgba(15, 23, 42, 0.08)',
    countColor: '#0f172a',
    iconBackground: 'rgba(180, 83, 9, 0.14)',
    iconColor: '#b45309',
  },
  {
    name: 'Internasional',
    emoji: '🌍',
    accent: '#0f766e',
    surface: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
    titleColor: '#0f172a',
    mutedColor: '#334155',
    countBackground: 'rgba(15, 23, 42, 0.08)',
    countColor: '#0f172a',
    iconBackground: 'rgba(15, 118, 110, 0.14)',
    iconColor: '#0f766e',
  },
];

const styles = {
  page: {
    minHeight: '100vh',
    height: '100vh',
    overflow: 'hidden',
    padding: '18px',
    color: '#e5eefb',
    background:
      'radial-gradient(circle at top left, rgba(56, 189, 248, 0.26), transparent 34%), radial-gradient(circle at top right, rgba(16, 185, 129, 0.18), transparent 32%), linear-gradient(135deg, #08121f 0%, #0b1729 45%, #09101a 100%)',
  },
  shell: {
    maxWidth: '1440px',
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 0.8fr)',
    gap: '12px',
    flex: '0 0 auto',
  },
  heroPanel: {
    borderRadius: '24px',
    padding: '18px',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(7, 12, 24, 0.78)',
    boxShadow: '0 18px 40px rgba(2, 6, 23, 0.28)',
    backdropFilter: 'blur(18px)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#dbeafe',
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.02em',
  },
  title: {
    margin: '12px 0 8px',
    fontSize: 'clamp(26px, 3vw, 42px)',
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: '-0.04em',
  },
  subtitle: {
    margin: 0,
    maxWidth: '70ch',
    color: '#9fb2c9',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    lineHeight: 1,
    fontWeight: 800,
    color: '#f8fafc',
  },
  statHint: {
    marginTop: '6px',
    color: '#8ea2ba',
    fontSize: '13px',
  },
  clockWrap: {
    marginTop: '10px',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  analogClock: {
    position: 'relative',
    margin: '4px 10px 6px 0',
    width: '128px',
    height: '128px',
    borderRadius: '999px',
    background: 'radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.26), rgba(30, 41, 59, 0.95) 62%, rgba(15, 23, 42, 0.98) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.28)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -12px 24px rgba(2, 6, 23, 0.4), 0 16px 34px rgba(2, 6, 23, 0.35)',
    display: 'grid',
    placeItems: 'center',
  },
  clockInnerRing: {
    position: 'absolute',
    width: '102px',
    height: '102px',
    borderRadius: '999px',
    border: '1px solid rgba(148, 163, 184, 0.22)',
  },
  clockCenterDot: {
    position: 'absolute',
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    background: '#f8fafc',
    boxShadow: '0 0 0 2px rgba(15, 23, 42, 0.7)',
    zIndex: 5,
  },
  clockHand: {
    position: 'absolute',
    left: '50%',
    bottom: '50%',
    transformOrigin: 'bottom center',
    borderRadius: '999px',
  },
  clockMarksLayer: {
    position: 'absolute',
    inset: '0',
    borderRadius: '999px',
  },
  clockMark: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '2px',
    borderRadius: '999px',
    transformOrigin: '50% 0%',
  },
  clockCaption: {
    color: '#cbd5e1',
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  topActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  refreshButton: {
    borderRadius: '999px',
    padding: '8px 14px',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(14, 165, 233, 0.14))',
    color: '#eff6ff',
    fontWeight: 700,
    fontSize: '13px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    flex: '1 1 auto',
    minHeight: 0,
  },
  roomCard: {
    borderRadius: '22px',
    padding: '12px',
    minHeight: 0,
    border: '1px solid rgba(148, 163, 184, 0.16)',
    boxShadow: '0 16px 30px rgba(2, 6, 23, 0.22)',
    overflow: 'hidden',
  },
  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  roomTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  roomIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '14px',
    display: 'grid',
    placeItems: 'center',
    fontSize: '20px',
  },
  roomName: {
    margin: 0,
    fontSize: '20px',
    lineHeight: 1.1,
    fontWeight: 800,
  },
  roomMeta: {
    marginTop: '2px',
    color: 'inherit',
    fontSize: '12px',
  },
  roomCount: {
    borderRadius: '999px',
    padding: '6px 10px',
    fontWeight: 800,
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  nextCard: {
    borderRadius: '16px',
    padding: '12px',
    marginBottom: '10px',
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
  },
  nextLabel: {
    color: '#94a3b8',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '4px',
  },
  nextTopic: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: 'inherit',
  },
  nextInfo: {
    marginTop: '6px',
    color: 'inherit',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  compactInfo: {
    display: 'grid',
    gap: '6px',
    marginTop: '4px',
    padding: '10px 12px',
    borderRadius: '16px',
    background: 'rgba(15, 23, 42, 0.38)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  meetingList: {
    display: 'grid',
    gap: '5px',
    marginTop: '6px',
  },
  meetingItem: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gap: '8px',
    alignItems: 'center',
    padding: '7px 9px',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.34)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  picAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    fontSize: '11px',
    fontWeight: 800,
    color: '#0f172a',
    background: 'rgba(255, 255, 255, 0.82)',
    flex: '0 0 auto',
  },
  meetingText: {
    minWidth: 0,
    display: 'grid',
    gap: '2px',
  },
  meetingTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meetingMeta: {
    margin: 0,
    fontSize: '11px',
    lineHeight: 1.2,
    color: 'inherit',
    opacity: 0.9,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  liveBadge: {
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    borderRadius: '16px',
    padding: '14px',
    color: '#cbd5e1',
    background: 'rgba(15, 23, 42, 0.38)',
    border: '1px dashed rgba(148, 163, 184, 0.22)',
  },
  loadingState: {
    borderRadius: '16px',
    padding: '12px 14px',
    color: '#cbd5e1',
    background: 'rgba(15, 23, 42, 0.38)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
  },
};

const buildApiUrl = (path) => {
  const baseURL = process.env.REACT_APP_BASEURL || '';

  if (!baseURL) {
    return `/${path}`;
  }

  return `${baseURL.replace(/\/$/, '')}/${path}`;
};

const getValue = (item, keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== '') || '';

const getRoomName = (item) => String(getValue(item, ['room', 'ruangan', 'location']) || '').trim();

const formatTime = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const parseApiDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return null;

  const withSeparator = new Date(normalizedValue.replace(' ', 'T'));
  if (!Number.isNaN(withSeparator.getTime())) {
    return withSeparator;
  }

  const directValue = new Date(normalizedValue);
  return Number.isNaN(directValue.getTime()) ? null : directValue;
};

const isMeetingActive = (item, currentTime) => {
  const startValue = getValue(item, ['start_time', 'startTime', 'start_at', 'start']);
  const endValue = getValue(item, ['end_time', 'endTime', 'end_at', 'end']);
  const startDate = parseApiDateValue(startValue);
  const endDate = parseApiDateValue(endValue);

  if (!startDate && !endDate) {
    return false;
  }

  if (startDate && endDate) {
    return startDate <= currentTime && currentTime <= endDate;
  }

  if (startDate) {
    return currentTime >= startDate;
  }

  return currentTime <= endDate;
};

const sortMeetings = (items) => [...items].sort((left, right) => {
  const leftTime = new Date(getValue(left, ['start_time', 'startTime', 'start_at', 'start'])).getTime();
  const rightTime = new Date(getValue(right, ['start_time', 'startTime', 'start_at', 'start'])).getTime();

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
  if (Number.isNaN(leftTime)) return 1;
  if (Number.isNaN(rightTime)) return -1;
  return leftTime - rightTime;
});

const PublicRoomSchedule = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [now, setNow] = useState(new Date());
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef(false);

  const isMobile = viewportWidth <= 768;
  const isCompact = viewportWidth <= 430;

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setRefreshTick((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadMeetings = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      if (!hasLoadedRef.current) {
        setLoading(true);
      }

      try {
        const response = await fetch(buildApiUrl('dapi/meeting/room/list'), {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const data = payload?.data ?? payload ?? [];
        setMeetings(Array.isArray(data) ? data : []);
        hasLoadedRef.current = true;
      } catch (fetchError) {
        if (fetchError?.name !== 'AbortError') {
          if (!hasLoadedRef.current) {
            setMeetings([]);
          }
        }
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    };

    loadMeetings();

    return () => controller.abort();
  }, [refreshTick]);

  const roomCards = useMemo(() => {
    const grouped = DEFAULT_ROOMS.map((room) => {
      const roomMeetings = sortMeetings(
        meetings.filter((item) => getRoomName(item).toLowerCase() === room.name.toLowerCase()),
      ).filter((item) => {
        const startValue = getValue(item, ['start_time', 'startTime', 'start_at', 'start']);
        const endValue = getValue(item, ['end_time', 'endTime', 'end_at', 'end']);
        const startDate = parseApiDateValue(startValue);
        const endDate = parseApiDateValue(endValue);

        const isSameCalendarDay = (leftDate, rightDate) => (
          leftDate
          && rightDate
          && leftDate.getFullYear() === rightDate.getFullYear()
          && leftDate.getMonth() === rightDate.getMonth()
          && leftDate.getDate() === rightDate.getDate()
        );

        if (startDate && endDate) {
          return isSameCalendarDay(startDate, now) || (startDate <= now && now <= endDate);
        }

        if (startDate) {
          return isSameCalendarDay(startDate, now) || startDate <= now;
        }

        if (endDate) {
          return now <= endDate;
        }

        return false;
      });

      const activeMeeting = roomMeetings.find((item) => isMeetingActive(item, now)) || null;

      return {
        ...room,
        meetings: roomMeetings,
        total: roomMeetings.length,
        next: activeMeeting || roomMeetings[0] || null,
        activeMeeting,
      };
    });

    const extraRooms = Array.from(new Set(meetings.map((item) => getRoomName(item)).filter(Boolean)))
      .filter((roomName) => !DEFAULT_ROOMS.some((room) => room.name.toLowerCase() === roomName.toLowerCase()))
      .map((roomName, index) => {
        const roomMeetings = sortMeetings(meetings.filter((item) => getRoomName(item).toLowerCase() === roomName.toLowerCase()))
          .filter((item) => {
            const startValue = getValue(item, ['start_time', 'startTime', 'start_at', 'start']);
            const endValue = getValue(item, ['end_time', 'endTime', 'end_at', 'end']);
            const startDate = parseApiDateValue(startValue);
            const endDate = parseApiDateValue(endValue);

            const isSameCalendarDay = (leftDate, rightDate) => (
              leftDate
              && rightDate
              && leftDate.getFullYear() === rightDate.getFullYear()
              && leftDate.getMonth() === rightDate.getMonth()
              && leftDate.getDate() === rightDate.getDate()
            );

            if (startDate && endDate) {
              return isSameCalendarDay(startDate, now) || (startDate <= now && now <= endDate);
            }

            if (startDate) {
              return isSameCalendarDay(startDate, now) || startDate <= now;
            }

            if (endDate) {
              return now <= endDate;
            }

            return false;
          });
        const activeMeeting = roomMeetings.find((item) => isMeetingActive(item, now)) || null;
        return {
          name: roomName,
          emoji: ['🏢', '🪑', '📅', '📍'][index % 4],
          accent: ['#4f46e5', '#be185d', '#0f766e', '#7c3aed'][index % 4],
          surface: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.95) 100%)',
          meetings: roomMeetings,
          total: roomMeetings.length,
          next: activeMeeting || roomMeetings[0] || null,
          activeMeeting,
        };
      });

    return [...grouped, ...extraRooms];
  }, [meetings]);

  const totalMeetings = roomCards.reduce((sum, room) => sum + room.total, 0);
  const activeRooms = roomCards.filter((room) => room.total > 0).length;
  const secondProgress = now.getSeconds() + (now.getMilliseconds() / 1000);
  const minuteProgress = now.getMinutes() + (secondProgress / 60);
  const hourProgress = (now.getHours() % 12) + (minuteProgress / 60);
  const secondRotation = secondProgress * 6;
  const minuteRotation = minuteProgress * 6;
  const hourRotation = hourProgress * 30;
  const responsiveStyles = useMemo(() => ({
    page: {
      ...styles.page,
      height: isMobile ? 'auto' : styles.page.height,
      minHeight: '100vh',
      overflow: isMobile ? 'auto' : styles.page.overflow,
      padding: isCompact ? '10px' : (isMobile ? '12px' : styles.page.padding),
    },
    shell: {
      ...styles.shell,
      height: isMobile ? 'auto' : styles.shell.height,
      gap: isCompact ? '10px' : styles.shell.gap,
    },
    hero: {
      ...styles.hero,
      gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : styles.hero.gridTemplateColumns,
      gap: isCompact ? '10px' : styles.hero.gap,
    },
    heroPanel: {
      ...styles.heroPanel,
      borderRadius: isCompact ? '16px' : styles.heroPanel.borderRadius,
      padding: isCompact ? '12px' : (isMobile ? '14px' : styles.heroPanel.padding),
    },
    badge: {
      ...styles.badge,
      fontSize: isCompact ? '11px' : styles.badge.fontSize,
      padding: isCompact ? '6px 10px' : styles.badge.padding,
    },
    title: {
      ...styles.title,
      fontSize: isCompact ? '22px' : (isMobile ? '26px' : styles.title.fontSize),
      lineHeight: isCompact ? 1.15 : styles.title.lineHeight,
    },
    subtitle: {
      ...styles.subtitle,
      maxWidth: isMobile ? '100%' : styles.subtitle.maxWidth,
      fontSize: isCompact ? '12px' : styles.subtitle.fontSize,
    },
    topActions: {
      ...styles.topActions,
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    refreshButton: {
      ...styles.refreshButton,
      width: 'auto',
      fontSize: isCompact ? '12px' : styles.refreshButton.fontSize,
      padding: isCompact ? '7px 12px' : styles.refreshButton.padding,
      whiteSpace: 'nowrap',
    },
    statLabel: {
      ...styles.statLabel,
      fontSize: isCompact ? '11px' : styles.statLabel.fontSize,
      marginBottom: isCompact ? '6px' : styles.statLabel.marginBottom,
    },
    statHint: {
      ...styles.statHint,
      fontSize: isCompact ? '11px' : styles.statHint.fontSize,
      marginTop: isCompact ? '4px' : styles.statHint.marginTop,
    },
    clockWrap: {
      ...styles.clockWrap,
      gap: isCompact ? '8px' : '10px',
      alignItems: 'center',
      marginTop: 0,
      marginBottom: isCompact ? '4px' : styles.clockWrap.marginBottom,
    },
    analogClock: {
      ...styles.analogClock,
      margin: isCompact ? '3px 8px 5px 0' : (isMobile ? '4px 9px 6px 0' : styles.analogClock.margin),
      width: isCompact ? '78px' : (isMobile ? '88px' : '104px'),
      height: isCompact ? '78px' : (isMobile ? '88px' : '104px'),
    },
    clockInnerRing: {
      ...styles.clockInnerRing,
      width: isCompact ? '58px' : (isMobile ? '68px' : '80px'),
      height: isCompact ? '58px' : (isMobile ? '68px' : '80px'),
    },
    clockCenterDot: {
      ...styles.clockCenterDot,
      width: isCompact ? '8px' : styles.clockCenterDot.width,
      height: isCompact ? '8px' : styles.clockCenterDot.height,
    },
    clockCaption: {
      ...styles.clockCaption,
      fontSize: isCompact ? '10px' : styles.clockCaption.fontSize,
    },
    contentGrid: {
      ...styles.contentGrid,
      gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : styles.contentGrid.gridTemplateColumns,
      gap: isCompact ? '8px' : styles.contentGrid.gap,
    },
    roomCard: {
      ...styles.roomCard,
      borderRadius: isCompact ? '16px' : styles.roomCard.borderRadius,
      padding: isCompact ? '10px' : (isMobile ? '11px' : styles.roomCard.padding),
    },
    roomHeader: {
      ...styles.roomHeader,
      flexWrap: isCompact ? 'wrap' : 'nowrap',
      gap: isCompact ? '8px' : styles.roomHeader.gap,
    },
    roomTitleWrap: {
      ...styles.roomTitleWrap,
      gap: isCompact ? '10px' : styles.roomTitleWrap.gap,
    },
    roomIcon: {
      ...styles.roomIcon,
      width: isCompact ? '34px' : styles.roomIcon.width,
      height: isCompact ? '34px' : styles.roomIcon.height,
      borderRadius: isCompact ? '11px' : styles.roomIcon.borderRadius,
      fontSize: isCompact ? '17px' : styles.roomIcon.fontSize,
    },
    roomName: {
      ...styles.roomName,
      fontSize: isCompact ? '17px' : styles.roomName.fontSize,
    },
    roomMeta: {
      ...styles.roomMeta,
      fontSize: isCompact ? '11px' : styles.roomMeta.fontSize,
    },
    roomCount: {
      ...styles.roomCount,
      fontSize: isCompact ? '11px' : styles.roomCount.fontSize,
      padding: isCompact ? '5px 9px' : styles.roomCount.padding,
    },
    meetingItem: {
      ...styles.meetingItem,
      gridTemplateColumns: isCompact ? 'auto minmax(0, 1fr)' : styles.meetingItem.gridTemplateColumns,
      gap: isCompact ? '8px' : styles.meetingItem.gap,
      padding: isCompact ? '8px' : styles.meetingItem.padding,
    },
    picAvatar: {
      ...styles.picAvatar,
      width: isCompact ? '26px' : styles.picAvatar.width,
      height: isCompact ? '26px' : styles.picAvatar.height,
      fontSize: isCompact ? '10px' : styles.picAvatar.fontSize,
    },
    meetingTitle: {
      ...styles.meetingTitle,
      fontSize: isCompact ? '12px' : styles.meetingTitle.fontSize,
      whiteSpace: isCompact ? 'normal' : styles.meetingTitle.whiteSpace,
      overflow: isCompact ? 'visible' : styles.meetingTitle.overflow,
      textOverflow: isCompact ? 'clip' : styles.meetingTitle.textOverflow,
    },
    meetingMeta: {
      ...styles.meetingMeta,
      fontSize: isCompact ? '10px' : styles.meetingMeta.fontSize,
      whiteSpace: isCompact ? 'normal' : styles.meetingMeta.whiteSpace,
      overflow: isCompact ? 'visible' : styles.meetingMeta.overflow,
      textOverflow: isCompact ? 'clip' : styles.meetingMeta.textOverflow,
    },
    liveBadge: {
      ...styles.liveBadge,
      display: isCompact ? 'none' : 'inline-block',
    },
    footer: {
      flex: '0 0 auto',
      color: '#cbd5e1',
      fontSize: isCompact ? '12px' : '13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '6px' : 0,
    },
  }), [isMobile, isCompact]);

  return (
    <div style={responsiveStyles.page}>
      <div style={responsiveStyles.shell}>
        <div style={responsiveStyles.hero}>
          <Card style={responsiveStyles.heroPanel} className="border-0">
            <CardBody className="p-0">
              <div style={responsiveStyles.badge}>Pusat Informasi</div>
              <h1 style={responsiveStyles.title}>Jadwal Rapat PT Pembangunan Aceh</h1>
              <p style={responsiveStyles.subtitle}>
                Informasi Agenda Rapat yang berlangsung hari ini di setiap Ruang rapat PT Pembangunan Aceh (Perseroda)
              </p>
            </CardBody>
          </Card>

          <Card style={responsiveStyles.heroPanel} className="border-0">
            <CardBody className="p-0">
              <div style={responsiveStyles.topActions}>
                <div>
                  {/* <div style={responsiveStyles.statLabel}>Waktu server</div> */}
                  <div style={responsiveStyles.clockWrap}>
                  <div style={responsiveStyles.analogClock}>
                    <div style={responsiveStyles.clockInnerRing} />
                    <div style={styles.clockMarksLayer}>
                      {Array.from({ length: 12 }).map((_, index) => {
                        const isMajorMark = index % 3 === 0;
                        const angle = index * 30;
                        const markLength = isMajorMark ? (isCompact ? 12 : 16) : (isCompact ? 7 : 10);
                        const markOffset = isCompact ? -42 : (isMobile ? -49 : -57);
                        return (
                          <div
                            key={`mark-${angle}`}
                            style={{
                              ...styles.clockMark,
                              height: `${markLength}px`,
                              background: isMajorMark ? 'rgba(226, 232, 240, 0.82)' : 'rgba(148, 163, 184, 0.64)',
                              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(${markOffset}px)`,
                            }}
                          />
                        );
                      })}
                    </div>

                    <div
                      style={{
                        ...styles.clockHand,
                        width: isCompact ? '4px' : '5px',
                        height: isCompact ? '19px' : (isMobile ? '23px' : '30px'),
                        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                        transform: `translateX(-50%) rotate(${hourRotation}deg)`,
                        zIndex: 3,
                      }}
                    />
                    <div
                      style={{
                        ...styles.clockHand,
                        width: '3px',
                        height: isCompact ? '24px' : (isMobile ? '29px' : '38px'),
                        background: 'linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%)',
                        transform: `translateX(-50%) rotate(${minuteRotation}deg)`,
                        zIndex: 4,
                      }}
                    />
                    <div
                      style={{
                        ...styles.clockHand,
                        width: '2px',
                        height: isCompact ? '29px' : (isMobile ? '34px' : '43px'),
                        background: 'linear-gradient(180deg, #f43f5e 0%, #fb7185 100%)',
                        transform: `translateX(-50%) rotate(${secondRotation}deg)`,
                        zIndex: 4,
                      }}
                    />
                    <div style={responsiveStyles.clockCenterDot} />
                  </div>

                  <div>
                    <div style={{ ...styles.statValue, fontSize: isCompact ? '18px' : (isMobile ? '20px' : '24px') }}>
                      {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </div>
                    <div style={responsiveStyles.clockCaption}>Server Time</div>
                  </div>
                </div>
                </div>
                <Button style={responsiveStyles.refreshButton} onClick={() => setRefreshTick((value) => value + 1)} disabled={loading}>
                  {loading ? 'Memuat...' : 'Muat ulang'}
                </Button>
              </div>
              <div style={responsiveStyles.statHint}>{now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </CardBody>
          </Card>
        </div>

        <div style={responsiveStyles.contentGrid}>
          {roomCards.map((room) => (
            <Card key={room.name} style={{ ...responsiveStyles.roomCard, background: room.surface, color: room.titleColor || '#f8fafc' }} className="border-0">
              <CardBody className="p-0 d-flex flex-column h-100">
                <div style={responsiveStyles.roomHeader}>
                  <div style={responsiveStyles.roomTitleWrap}>
                    <div
                      style={{
                        ...responsiveStyles.roomIcon,
                        background: room.iconBackground || 'rgba(255, 255, 255, 0.46)',
                        color: room.iconColor || '#0f172a',
                      }}
                    >
                      {room.emoji}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={responsiveStyles.roomName}>{room.name}</h2>
                      <div style={responsiveStyles.roomMeta}>Pembaruan jadwal ruang</div>
                    </div>
                  </div>
                  <div style={{ ...responsiveStyles.roomCount, background: room.countBackground || 'rgba(255, 255, 255, 0.8)', color: room.countColor || '#08111f' }}>{room.total} rapat</div>
                </div>

                <div style={styles.meetingList}>
                  {room.meetings.slice(0, 3).map((item) => {
                    const title = getValue(item, ['topic', 'title', 'name']) || 'Rapat';
                    const start = getValue(item, ['start_time', 'startTime', 'start_at', 'start']);
                    const end = getValue(item, ['end_time', 'endTime', 'end_at', 'end']);
                    const pic = getValue(item, ['created_by_name', 'created_by', 'creator_name', 'user_name', 'name']) || '-';
                    const picInitial = String(pic).trim().charAt(0).toUpperCase() || 'P';
                    const active = isMeetingActive(item, now);
                    const rowKey = [room.name, title, start, end, pic].filter(Boolean).join('-');

                    return (
                      <div key={rowKey} style={responsiveStyles.meetingItem}>
                        <div style={responsiveStyles.picAvatar}>{picInitial}</div>
                        <div style={styles.meetingText}>
                          <p style={responsiveStyles.meetingTitle}>{title}</p>
                          <p style={responsiveStyles.meetingMeta}>
                            {pic} • {formatTime(start)} - {formatTime(end)}
                          </p>
                        </div>
                        {active ? (
                          <div
                            style={{
                              ...responsiveStyles.liveBadge,
                              background: 'rgba(34, 197, 94, 0.18)',
                              color: '#166534',
                              border: '1px solid rgba(34, 197, 94, 0.26)',
                            }}
                          >
                            Live
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {!loading && room.meetings.length === 0 ? <div style={styles.emptyState}>Tidak ada jadwal hari ini.</div> : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div style={responsiveStyles.footer}>
          <div>{loading ? <span className="d-inline-flex align-items-center gap-2"><Spinner size="sm" color="light" /> Memuat jadwal rapat...</span> : `${totalMeetings} booking aktif • ${activeRooms} ruangan terisi (data hari ini)`}</div>
          <div>PT PEMA</div>
        </div>
      </div>
    </div>
  );
};

export default PublicRoomSchedule;